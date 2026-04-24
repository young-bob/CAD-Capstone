# VSMS Infrastructure - Terraform + VPC Peering

Multi-account AWS deployment with full-mesh VPC Peering for the VSMS Capstone project.

## Architecture

```
4 AWS Accounts × 2 EC2 each = 8 nodes
Region: ca-central-1 (Canada)
OS: Debian 13 ARM64 (ami-0431110c89be170a4)
Networking: VPC Peering (full mesh, 6 connections)
```

| Account | Role | VPC CIDR | IAM/Bedrock | EIP | EC2 #1 | EC2 #2 |
|---------|------|----------|-------------|-----|--------|--------|
| **chunxi** | Gateway | 10.16.0.0/16 | ❌ | ✅ Nginx entry | Nginx LB + Web | MinIO |
| **brad** | API Cluster 1 | 10.17.0.0/16 | ✅ | — | API Silo 1 | API Silo 2 |
| **boyang** | API Cluster 2 | 10.18.0.0/16 | ✅ | ✅ SSH bastion | API Silo 3 | API Silo 4 |
| **marieth** | Data Layer | 10.19.0.0/16 | ✅ | — | PostgreSQL 17 | API Silo 5 |

### Security Group Rules

All accounts share a base SG:

| Port | Protocol | Source | Description |
|------|----------|--------|-------------|
| 51822 | UDP | 0.0.0.0/0 | WireGuard VPN |
| ALL | ALL | 10.16.0.0/14 | Inter-VPC traffic |

Account-specific rules:

| Account | Extra Ports | Description |
|---------|------------|-------------|
| **chunxi** | 80/TCP, 443/TCP | HTTP/HTTPS (gateway only, `enable_http = true`) |
| **boyang** | 51522/TCP | SSH bastion (external port) |

### AWS Profile Binding

Each account's `provider` block has a hard-coded `profile`, preventing accidental cross-account operations:

| Directory | Profile | Account ID |
|-----------|---------|------------|
| `accounts/boyang/` | `default` | 891377297180 |
| `accounts/chunxi/` | `chunxi` | 188847977220 |
| `accounts/brad/` | `brad` | 491243661019 |
| `accounts/marieth/` | `marieth` | 568598294678 |

> No need to set `AWS_PROFILE` manually — just `terraform apply` in the correct directory.

## VPC Peering Topology (Full Mesh — 6 connections)

```
         chunxi (Gateway)
        /      |      \
       /       |       \
    brad ---- boyang    |
       \       |       /
        \      |      /
         marieth (DB)
```

| # | Initiator → Acceptor | Purpose |
|---|---------------------|---------|
| 1 | boyang → chunxi | API ↔ Gateway |
| 2 | boyang → brad | Orleans cluster sync |
| 3 | boyang → marieth | API → PostgreSQL |
| 4 | chunxi → brad | Nginx → API Silos 1,2 |
| 5 | chunxi → marieth | Nginx → Silo 5 |
| 6 | brad → marieth | API → PostgreSQL |

---

## Deployment Guide

### Prerequisites

- AWS CLI configured with profiles: `default` (boyang), `chunxi`, `brad`, `marieth`
- Terraform >= 1.5
- SSH Key Pair `Capstone` imported in all accounts

---

### Phase 1: Create VPC + EC2 (all 4 accounts, independently)

```bash
# All accounts — no need to set AWS_PROFILE (hard-coded in provider)
cd terraform/accounts/boyang
cp terraform.tfvars.example terraform.tfvars
terraform init && terraform apply -auto-approve

cd ../chunxi
cp terraform.tfvars.example terraform.tfvars
terraform init && terraform apply -auto-approve

cd ../brad
cp terraform.tfvars.example terraform.tfvars
terraform init && terraform apply -auto-approve

cd ../marieth
cp terraform.tfvars.example terraform.tfvars
terraform init && terraform apply -auto-approve
```

Collect `vpc_id` and `account_id` from each account's `terraform output`.

---

### Phase 2: Set up VPC Peering (sequential order!)

> ⚠️ **Must follow this exact order. Each step depends on the previous one.**

#### Step 1 — Boyang (initiates 3 peering connections)

Add peer info to `boyang/terraform.tfvars`:

```hcl
chunxi_account_id  = "188847977220"
chunxi_vpc_id      = "vpc-xxx"     # from chunxi output
brad_account_id    = "491243661019"
brad_vpc_id        = "vpc-xxx"     # from brad output
marieth_account_id = "568598294678"
marieth_vpc_id     = "vpc-xxx"     # from marieth output
```

```bash
terraform apply -auto-approve
# → outputs: peering_id_to_chunxi, peering_id_to_brad, peering_id_to_marieth
```

#### Step 2 — Chunxi (accepts 1 from boyang, initiates 2)

Add to `chunxi/terraform.tfvars`:

```hcl
peering_id_from_boyang = "pcx-xxx"   # from boyang output
brad_account_id        = "491243661019"
brad_vpc_id            = "vpc-xxx"
marieth_account_id     = "568598294678"
marieth_vpc_id         = "vpc-xxx"
```

```bash
terraform apply -auto-approve
# → outputs: peering_id_to_brad, peering_id_to_marieth
```

#### Step 3 — Brad (accepts 2, initiates 1)

Add to `brad/terraform.tfvars`:

```hcl
peering_id_from_boyang = "pcx-xxx"   # from boyang output
peering_id_from_chunxi = "pcx-xxx"   # from chunxi output
marieth_account_id     = "568598294678"
marieth_vpc_id         = "vpc-xxx"
```

```bash
terraform apply -auto-approve
# → outputs: peering_id_to_marieth
```

#### Step 4 — Marieth (accepts all 3)

Add to `marieth/terraform.tfvars`:

```hcl
peering_id_from_boyang = "pcx-xxx"   # from boyang output
peering_id_from_chunxi = "pcx-xxx"   # from chunxi output
peering_id_from_brad   = "pcx-xxx"   # from brad output
```

```bash
terraform apply -auto-approve
```

✅ **All 6 peering connections + 12 routes are now active!**

---

### Phase 3: Verify connectivity

SSH into any EC2 via bastion and ping across VPCs:

```bash
# SSH to boyang_1 (bastion), then ping chunxi
ssh -p 51522 admin@<boyang_1_eip>
ping 10.16.1.x     # Expected: < 2ms
```

---

### Phase 4: Deploy VSMS services

SSH via bastion (boyang_1) and deploy using podman-compose on each node.

---

## Cleanup

Use the targeted nuke script (safe for other systems):

```bash
cd terraform
./nuke.sh
```

Or manually destroy in reverse order:

```bash
cd terraform/accounts/marieth && terraform destroy
cd ../brad    && terraform destroy
cd ../chunxi  && terraform destroy
cd ../boyang  && terraform destroy
```

---

## Directory Structure

```
terraform/
├── README.md                          ← This file
├── nuke.sh                            ← Targeted cleanup script (safe)
├── modules/
│   └── vsms-node/                     ← Reusable VPC + 2×EC2 module
│       ├── main.tf                    ← VPC, SG, IAM, EC2, EIP
│       ├── variables.tf               ← region, vpc_cidr, enable_*...
│       └── outputs.tf                 ← vpc_id, private_ips, eip...
└── accounts/
    ├── boyang/                        ← API Cluster 2 (10.18.0.0/16)
    │   ├── main.tf                    ← profile=default, enable_eip=true
    │   ├── peering.tf                 ← Initiates 3 peering connections
    │   ├── variables.tf
    │   └── terraform.tfvars.example
    ├── chunxi/                        ← Gateway (10.16.0.0/16)
    │   ├── main.tf                    ← profile=chunxi, enable_eip/http=true
    │   ├── peering.tf                 ← Accepts 1 + Initiates 2
    │   ├── variables.tf
    │   └── terraform.tfvars.example
    ├── brad/                          ← API Cluster 1 (10.17.0.0/16)
    │   ├── main.tf                    ← profile=brad
    │   ├── peering.tf                 ← Accepts 2 + Initiates 1
    │   ├── variables.tf
    │   └── terraform.tfvars.example
    └── marieth/                       ← Data Layer (10.19.0.0/16)
        ├── main.tf                    ← profile=marieth
        ├── peering.tf                 ← Accepts 3
        ├── variables.tf
        └── terraform.tfvars.example
```

## Module Features

| Feature | Variable | Default | Description |
|---------|----------|---------|-------------|
| IAM/Bedrock | `enable_iam` | `true` | Create IAM role with `AmazonBedrockFullAccess` |
| Elastic IP | `enable_eip` | `false` | Attach EIP to node[0] |
| HTTP/HTTPS | `enable_http` | `false` | Open 80/443 from internet (gateway only) |
| Public IP | `enable_public_ip` | `true` | Assign public IPs via subnet |
| Instance Types | `instance_types` | `["t4g.small", "t4g.small"]` | Per-node instance sizing |
| Disk Size | `disk_size_gb` | `10` | Root EBS volume size |

## Troubleshooting

### Peering error: "VpcPeeringConnectionId not found"

The previous step's `terraform apply` hasn't run yet. Follow the order: boyang → chunxi → brad → marieth.

### IAM CreateRole AccessDenied

Set `enable_iam = false` in the module call if the account lacks IAM permissions.

### Can't ping across VPCs

1. Check peering status: `aws ec2 describe-vpc-peering-connections`
2. Verify routes exist: `aws ec2 describe-route-tables`
3. Verify Security Group allows `10.16.0.0/14`

### Route conflicts on apply

The module uses separate `aws_route` resources (not inline). If routes are missing after apply, run `terraform apply` again to recreate them.

### terraform apply fails on peering with empty variables

Phase 1 only creates VPC + EC2 (peering variables default to `""`). Fill in the variables in `terraform.tfvars` before Phase 2.
