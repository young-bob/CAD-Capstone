# VSMS Capstone - AWS Deployment Report

**Course:** INFO8372 - Cloud Fundamentals for Developers 
**Team Members:** Bo Yang, Bo Zhang, Chunxi Zhang, Marieth Franciss Perez Zevallos
**Date:** April 17, 2026 
**Region:** ca-central-1 (Canada)

---

## 1. Architecture Overview

The Volunteer Shift Management System (VSMS) is deployed across **4 AWS accounts** with **8 EC2 instances** in a multi-tier architecture. Each team member owns one AWS account, and all accounts are interconnected via a **full-mesh VPC Peering** topology.

### 1.1 Architecture Diagram

```mermaid
graph LR
    Internet["🌐 Internet / Users"]
    GitHub["📦 GitHub"]
    VpnClient["🔐 Team Members"]

    subgraph AWS["☁️ AWS ca-central-1"]

        subgraph chunxi["chunxi — VPC (10.16.0.0/16)"]
            chunxi1["chunxi_1 (EIP)<br/>HAProxy LB + TLS 1.3<br/>React Web SPA"]
            chunxi2["chunxi_2<br/>MinIO File Storage<br/>Container Registry :5000<br/>Build Server"]
        end

        subgraph boyang["boyang — VPC (10.18.0.0/16)"]
            boyang1["boyang_1 (EIP)<br/>Orleans API Silo 1<br/>SSH Bastion + WireGuard Hub"]
            boyang2["boyang_2<br/>Orleans API Silo 2"]
        end

        subgraph brad["brad — VPC (10.17.0.0/16)"]
            brad1["brad_1<br/>Orleans API Silo 3"]
            brad2["brad_2<br/>Orleans API Silo 4"]
        end

        subgraph marieth["marieth — VPC (10.19.0.0/16)"]
            marieth1["marieth_1<br/>PostgreSQL 17"]
            marieth2["marieth_2<br/>Orleans API Silo 5"]
        end

    end

    Internet -->|"HTTPS 443"| chunxi1
    VpnClient -->|"WireGuard 51822/UDP"| boyang1
    GitHub -->|"git poll + build"| chunxi2

    chunxi1 -->|"Round-Robin LB"| boyang1
    chunxi1 -->|"Round-Robin LB"| boyang2
    chunxi1 -->|"Round-Robin LB"| brad1
    chunxi1 -->|"Round-Robin LB"| brad2
    chunxi1 -->|"Round-Robin LB"| marieth2

    boyang1 & boyang2 & brad1 & brad2 & marieth2 -->|"SQL"| marieth1
    boyang1 & boyang2 & brad1 & brad2 & marieth2 -->|"S3 API"| chunxi2

    chunxi2 -->|"image pull"| chunxi1
    chunxi2 -->|"image pull"| boyang1
    chunxi2 -->|"image pull"| boyang2
    chunxi2 -->|"image pull"| brad1
    chunxi2 -->|"image pull"| brad2
    chunxi2 -->|"image pull"| marieth2

    chunxi <-->|"VPC Peering"| boyang
    chunxi <-->|"VPC Peering"| brad
    chunxi <-->|"VPC Peering"| marieth
    boyang <-->|"VPC Peering"| brad
    boyang <-->|"VPC Peering"| marieth
    brad <-->|"VPC Peering"| marieth
```

### 1.2 Node Assignment

| Account | VPC CIDR | EC2 #1 Role | EC2 #2 Role | Special Features |
|---------|----------|-------------|-------------|------------------|
| **chunxi** | 10.16.0.0/16 | HAProxy LB + Web SPA | MinIO + Container Registry + Build Server | Elastic IP, HTTP/HTTPS open |
| **brad** | 10.17.0.0/16 | Orleans API Silo 3 | Orleans API Silo 4 | IAM + Bedrock Access |
| **boyang** | 10.18.0.0/16 | Orleans API Silo 1 + WireGuard Hub | Orleans API Silo 2 | Elastic IP, WireGuard |
| **marieth** | 10.19.0.0/16 | PostgreSQL 17 | Orleans API Silo 5 | IAM + Bedrock Access |

---

## 2. AWS Services Used

### 2.1 Compute - Amazon EC2

- **8 instances** across 4 accounts, running **Debian 13 ARM64** (`t4g.small`)
- 5 instances host **Orleans API Silos** (.NET 10), forming a distributed actor-model cluster
- 1 instance runs **HAProxy** as a TLS-terminating reverse proxy and serves the React Web SPA
- 1 instance runs **PostgreSQL 17** as the central database
- 1 instance runs **MinIO** for S3-compatible file storage
- All instances use 30 GB **gp3 EBS** volumes
- **User Data scripts** automate post-launch setup: hostname configuration, Podman installation, and environment tagging

**Scalability through Orleans:**

The VSMS backend uses **Microsoft Orleans**, a virtual actor framework that provides:
- **Automatic grain distribution** across 5 API Silos spanning 3 AWS accounts
- **Transparent failover** — if a silo goes down, Orleans redistributes grains to surviving silos
- **Horizontal scaling** — new silos can join the cluster by pointing to the same PostgreSQL membership table

**Multi-Account Resilience:**

The distributed architecture across 4 AWS accounts provides:
- **Blast radius reduction** — an account-level issue (e.g., billing suspension) only affects part of the system
- **Independent scaling** — each account can upgrade instance types or add nodes without affecting others

### 2.2 Networking - VPC + VPC Peering

```mermaid
graph LR
    chunxi["chunxi - VPC<br/>10.16.0.0/16"]
    boyang["boyang - VPC<br/>10.18.0.0/16"]
    brad["brad - VPC<br/>10.17.0.0/16"]
    marieth["marieth - VPC<br/>10.19.0.0/16"]

    boyang <-->|"#1 [boyang → chunxi]"| chunxi
    boyang <-->|"#2 [boyang → brad]"| brad
    boyang <-->|"#3 [boyang → marieth]"| marieth
    chunxi <-->|"#4 [chunxi → brad]"| brad
    chunxi <-->|"#5 [chunxi → marieth]"| marieth
    brad <-->|"#6 [brad → marieth]"| marieth
```

| # | Initiator → Acceptor |
|---|---------------------|
| 1 | boyang → chunxi |
| 2 | boyang → brad |
| 3 | boyang → marieth |
| 4 | chunxi → brad |
| 5 | chunxi → marieth |
| 6 | brad → marieth |

- **4 VPCs** with non-overlapping CIDR blocks (10.16–10.19.0.0/16)
- **Full-mesh VPC Peering**: 6 cross-account peering connections ensure every VPC can communicate directly with every other VPC
  
  - Links = n(n-1)/2 = 4x3/2 = 6
- A **supernet CIDR** (`10.16.0.0/14`) is used in Security Group rules to allow all inter-VPC traffic through a single rule:

  | VPC | CIDR | 16-bit Binary |
  |-----|------|---------------|
  | chunxi | 10.**16**.0.0/16 | 0000 1010 0001 00**00** |
  | brad | 10.**17**.0.0/16 | 0000 1010 0001 00**01** |
  | boyang | 10.**18**.0.0/16 | 0000 1010 0001 00**10** |
  | marieth | 10.**19**.0.0/16 | 0000 1010 0001 00**11** |

  The first **14 bits** are identical across all 4 VPCs. Only bits 15–16 vary (`00`–`11`), covering exactly 4 networks:

  $$10.16.0.0/14 \Rightarrow 10.16.0.0 \sim 10.19.255.255$$
- Each VPC has a public subnet, internet gateway, and route table with both IGW and peering routes

### 2.3 Load Balancing - HAProxy

The gateway runs **HAProxy** as a cross-VPC load balancer (chosen over AWS ALB because ALB cannot route to backends in peered VPCs across different accounts):

- **TLS 1.3 only** — cipher suites restricted to `TLS_AES_128_GCM_SHA256`, `TLS_AES_256_GCM_SHA384`, and `TLS_CHACHA20_POLY1305_SHA256`
- **HSTS** enabled with `max-age=31536000; includeSubDomains; preload`
- **Round-robin load balancing** across 5 API silos spanning 3 VPCs:
  - `api01` 10.18.1.226:8080 (boyang) 
  - `api02` 10.18.1.207:8080 (boyang)
  - `api03` 10.17.1.32:8080 (brad)
  - `api04` 10.17.1.224:8080 (brad)
  - `api05` 10.19.1.25:8080 (marieth)
- **Health checks** every 10 seconds with 3-strike failover (`check inter 10000 fall 3`)
- **Let's Encrypt TLS** with automated ACME challenge solver backend
- **Security hardening** — `/swagger` endpoints blocked in production via ACL deny rules
- **HTTP → HTTPS redirect** (301) for all non-ACME traffic

### 2.4 Storage - EBS + MinIO

- **EBS gp3** root volumes for all instances
- **MinIO** provides S3-compatible object storage for volunteer profile photos, attendance images, and certificate PDFs

### 2.5 Container Runtime - Podman

- All services are containerized and deployed using **Podman + podman-compose** (daemonless alternative to Docker)
- Separate compose files allow independent scaling of API, database, web, and file storage services

---

## 3. Deployment Steps & Terraform

### 3.1 Terraform Module: `vsms-node`

A single reusable Terraform module creates all per-account infrastructure:

```hcl
module "node" {
  source       = "../../modules/vsms-node"
  region       = "ca-central-1"
  vpc_cidr     = "10.18.0.0/16"
  subnet_cidr  = "10.18.1.0/24"
  role         = "api-2"
  owner_name   = "boyang"
  ami_id       = var.ami_id
  key_name     = var.key_name
  disk_size_gb = 30
  enable_eip   = true
}
```

The module supports **feature flags** for account-specific customization:

| Flag | Purpose | Used By |
|------|---------|---------|
| `enable_eip` | Attach Elastic IP to node[0] | chunxi (gateway), boyang (bastion) |
| `enable_http` | Open ports 80/443 from internet | chunxi (gateway) only |
| `enable_iam` | Create IAM role with Bedrock access | brad, boyang, marieth |
| `enable_public_ip` | Assign public IPs via subnet | All accounts |

Directory structure:

```
terraform/
├── modules/vsms-node/          ← Reusable VPC + 2×EC2 module
│   ├── main.tf                 ← VPC, SG, IAM, EC2, EIP
│   ├── variables.tf            ← Parameterized feature flags
│   └── outputs.tf              ← vpc_id, private_ips, eip
└── accounts/
    ├── boyang/                  ← API Cluster 2 + SSH Bastion
    ├── chunxi/                  ← Gateway (HAProxy + Web)
    ├── brad/                    ← API Cluster 1
    └── marieth/                 ← Data Layer (PostgreSQL)
```

### 3.2 Phase 1: Provision Infrastructure (Parallel)

All 4 accounts can be provisioned independently and simultaneously:

```bash
cd terraform/accounts/<member_name>
cp terraform.tfvars.example terraform.tfvars   # Edit with account-specific values
terraform init && terraform apply -auto-approve
```

Each account's Terraform config has a **hard-coded AWS profile** in the provider block, preventing accidental cross-account operations.

### 3.3 Phase 2: Establish VPC Peering (Sequential)

VPC Peering must follow a specific order due to cross-account dependencies:

1. **Boyang** initiates 3 peering connections → outputs peering IDs
2. **Chunxi** accepts 1 from Boyang, initiates 2 → outputs peering IDs
3. **Brad** accepts 2 (from Boyang + Chunxi), initiates 1 → outputs peering ID
4. **Marieth** accepts all 3 remaining connections

Each step adds the required peering IDs to `terraform.tfvars` and runs `terraform apply`. This creates **6 peering connections + 12 routes** total.

Each account has a dedicated `peering.tf` that uses **conditional creation** (`count` based on variable presence) to support this phased deployment:

```hcl
locals {
  peering_enabled = var.chunxi_vpc_id != "" && var.brad_vpc_id != ""
}

resource "aws_vpc_peering_connection" "to_chunxi" {
  count         = local.peering_enabled ? 1 : 0
  vpc_id        = module.node.vpc_id
  peer_vpc_id   = var.chunxi_vpc_id
  peer_owner_id = var.chunxi_account_id
  ...
}
```

This design allows Phase 1 (`terraform apply` without peering variables) and Phase 2 (with peering variables) to use the **same Terraform configuration**, avoiding separate state files.

### 3.4 Phase 3: Verify Connectivity

SSH into the bastion (boyang_1) and validate cross-VPC reachability:

```bash
ping 10.16.1.x   # Gateway
ping 10.17.1.x   # API Cluster 1
ping 10.19.1.x   # Data Layer
```

### 3.5 Phase 4: Deploy Application Services

SSH through the bastion and deploy services in order:

1. **marieth_1** — Start the database:
   - `podman-compose -f podman-compose.db.yml up -d` (PostgreSQL)
2. **chunxi_2** — Start file storage, private registry, and build initial images:
   - `podman-compose -f podman-compose.file.yml up -d` (MinIO)
   - `podman-compose -f podman-compose.registry.yml up -d` (Registry v2 on `:5000`)
   - Run `build-image.sh` to build `vsms-web` and `vsms-api` images and push to `10.16.1.11:5000`
3. **boyang_1/2, brad_1/2, marieth_2** — Pull API image from registry and start:
   - `podman pull --tls-verify=false 10.16.1.11:5000/vsms-api:latest`
   - `podman-compose -f podman-compose.api.yml up -d` (5 Orleans API Silos)
4. **chunxi_1** — Pull Web image from registry and start:
   - `podman pull --tls-verify=false 10.16.1.11:5000/vsms-web:latest`
   - `podman-compose -f podman-compose.web.yml up -d` (Web SPA) + HAProxy load balancer with TLS

### 3.6 Phase 5: Automated CI/CD Pipeline

After initial deployment, all subsequent updates are fully automated via a **poll-based CI/CD pipeline** using a private container registry:

```mermaid
graph LR
		TM["Team Members"] <--> GH["GitHub Repository"]
    GH -->|"Poll every 6 min"| Build["chunxi_2 - Build Server<br/>build-image.sh"]
    Build -->|"podman build & push image"| Registry["chunxi_2 - Private Registry<br/>10.16.1.11:5000"]
    Registry -->|"Digest comparison"| Web["chunxi_1<br/>deploy.sh → Web SPA"]
    Registry -->|"Digest comparison"| API1["boyang_1/boyang_2<br/>deploy.sh → API Silos"]
    Registry -->|"Digest comparison"| API2["brad_1/brad_2<br/>deploy.sh → API Silos"]
    Registry -->|"Digest comparison"| API3["marieth_2<br/>deploy.sh → API Silo"]
```

**Pipeline Components:**

| Component | Host | Mechanism |
|-----------|------|-----------|
| **Private Registry** | chunxi_2 (`:5000`) | Docker Registry v2 — stores `vsms-web` and `vsms-api` images internally |
| **Build Server** | chunxi_2 | `build-image.sh` - cron job polls GitHub `main` branch, compares `git ls-remote` hash vs local `HEAD`; on mismatch: `git pull` → `podman build` → `podman push` to registry |
| **Deploy Agent** | All service nodes | `deploy.sh` - cron job uses `skopeo inspect` to compare local image digest vs registry digest; on mismatch: `podman pull` → rolling restart via `podman compose down/up` |

**Key Design Decisions:**
- **No external CI/CD service** (no GitHub Actions, Jenkins, etc.) - fully self-hosted within the VPC network
- **Digest-based comparison** (`skopeo inspect` + `jq`) ensures deployments only trigger on actual image content changes, not just tag updates
- **Automatic cleanup** - dangling images and build cache are pruned after every build/deploy cycle
- **Internal registry traffic** stays within VPC Peering (`10.16.1.11:5000`), never touches the public internet

---

## 4. Security Considerations

| Category | Implementation |
|----------|---------------|
| **Network Isolation** | 4 separate VPCs with controlled peering; no public access except gateway |
| **Least Privilege SG** | HTTP/HTTPS only on gateway; SSH restricted to single admin IP (`/32`) on bastion |
| **No Hardcoded Secrets** | Database passwords, JWT secrets, API keys injected via environment variables from `.env` files |
| **IAM Roles over Keys** | EC2 instances access Amazon Bedrock via IAM instance profiles - no AWS credentials stored on disk |
| **WireGuard VPN** | Hub-and-spoke encrypted tunnel (see §4.2 below) for secure admin access to all 8 nodes |
| **Supernet Rule** | Inter-VPC traffic restricted to `10.16.0.0/14` - blocks traffic from any unrelated private networks |
| **Container Engine** | Daemonless Podman architecture, reducing attack surface compared to traditional Docker daemon |

### 4.1 Security Group Rules

- **IAM Roles** with `AmazonBedrockFullAccess` policy are attached via instance profiles to API nodes, enabling the AI Assistant to call Amazon Bedrock for LLM inference without hardcoded credentials
- **Security Groups** enforce least-privilege with only 3 inbound rules per account (+ account-specific additions):

**Base Security Group Rules (all accounts):**

| Type | Protocol | Port | Source | Purpose |
|------|----------|------|--------|---------|
| Custom UDP | UDP | 51822 | 0.0.0.0/0 | WireGuard VPN tunnel |
| All traffic | ALL | ALL | 10.16.0.0/14 | Inter-VPC communication (supernet) |

**Additional rules by account:**

| Account | Type | Port | Source | Purpose |
|---------|------|------|--------|---------|
| **boyang** | SSH | TCP | 22 | Admin IP/32 | Restricted SSH access (single IP only) |
| **chunxi** | TCP | 80, 443 | 0.0.0.0/0 | HTTP/HTTPS - gateway only |

> **Key design**: SSH is locked to a single admin IP (`/32`), not open to the internet. Only WireGuard (encrypted tunnel) and inter-VPC traffic are broadly allowed.

### 4.2 WireGuard VPN - Hub-and-Spoke Topology

The bastion node (boyang_1) acts as the **WireGuard VPN server**, providing each team member with encrypted access to the entire infrastructure across all 4 VPCs:

```mermaid
graph TD
    hub["🔐 boyang_1 - VPN Hub<br/>Interface: 10.20.0.1<br/>ListenPort: 51822/UDP<br/>IP Forward + NAT Masquerade"]

    peer1["💻 boyang<br/>10.20.0.2/32"]
    peer2["💻 chunxi<br/>10.20.0.3/32"]
    peer3["💻 brad<br/>10.20.0.4/32"]
    peer4["💻 marieth<br/>10.20.0.5/32"]

    vpc["☁️ All 4 VPCs<br/>10.16.0.0/14<br/>(8 EC2 Nodes)"]

    peer1 <-->|"WireGuard Tunnel"| hub
    peer2 <-->|"WireGuard Tunnel"| hub
    peer3 <-->|"WireGuard Tunnel"| hub
    peer4 <-->|"WireGuard Tunnel"| hub

    hub -->|"iptables NAT<br/>MASQUERADE via ens5"| vpc
```

- **VPN Subnet**: `10.20.0.0/24` - dedicated overlay network, isolated from VPC CIDRs
- **NAT Masquerading**: `iptables` rules on the hub forward VPN traffic to the VPC network (`ens5`), allowing any VPN client to reach all 8 EC2 nodes across all 4 VPCs via their private IPs
- **IP Forwarding**: Enabled via `sysctl` at tunnel startup (`PostUp`), automatically disabled on tunnel teardown (`PostDown`)
- **Authentication**: Each team member has a unique keypair; the server's `AllowedIPs` restricts each peer to a single `/32` address, preventing lateral movement between VPN clients

---

## 5. Challenges Faced

| Challenge | Solution |
|-----------|----------|
| **Why not AWS ALB?** | ALB cannot route to backends in peered VPCs across different AWS accounts; HAProxy on EC2 provides cross-VPC round-robin with full TLS control |
| **Cross-account VPC Peering** requires a specific accept/request sequence | Designed a 4-phase deployment order with clear output→input dependency chain |
| **Route table conflicts** between inline routes and separate `aws_route` resources | Removed all inline route blocks from `aws_route_table`; used only standalone `aws_route` resources |
| **IAM permission differences** across accounts | Added `enable_iam` feature flag so accounts without IAM permissions can skip role creation |
| **Podman networking** across VPC-peered nodes | Used host networking mode for Orleans clustering; PostgreSQL connection string references private IPs |
| **Security group complexity** with 4 VPCs | Used a `/14` supernet CIDR (`10.16.0.0/14`) to cover all 4 VPCs in a single ingress rule |

---

## 6. Screenshots

### 6.1 Running Application

#### 6.1.1 DNS

<img src="screenshots/dig.png" alt="VSMS DNS" style="zoom:50%;" />

#### 6.1.2 HAProxy Load Balancer

![VSMS Web LB](screenshots/HAProxy_Load_Balancer.png)

<img src="screenshots/haproxy1.png" alt="VSMS Web LB" style="zoom:40%;" />

<img src="screenshots/haproxy2.png" alt="VSMS Web LB" style="zoom:40%;" />

<img src="screenshots/haproxy3.png" alt="VSMS Web LB" style="zoom:50%;" />

#### 6.1.3 System Info

<img src="screenshots/vsms-web-dashboard.png" alt="VSMS Web Dashboard" style="zoom:50%;" />

#### 6.1.4 CI/CD

<img src="screenshots/build.png" alt="VSMS Web Dashboard" style="zoom:32%;" />

<img src="screenshots/deploy.png" alt="VSMS Web Dashboard" style="zoom:40%;" />

### 6.2 AWS Resources

#### 6.2.1 AWS EC2 Console

8 running instances across 4 accounts (2 per account)

##### Bo Yang EC2

<img src="screenshots/EC2_yangbo.png" alt="EC2 Instances" style="zoom:30%;" />

##### Chunxi EC2

<img src="screenshots/EC2.png" alt="EC2 Instances" style="zoom:50%;" />

##### Bo Zhang EC2

<img src="screenshots/EC2_Brad.png" alt="EC2 Instances" style="zoom:30%;" />

##### Marieth EC2

<img src="screenshots/EC2_Marieth.png" alt="EC2 Instances" style="zoom:40%;" />

#### 6.2.2 VPC Peering Connections

**6 active full-mesh peering connections**

##### Bo Yang VPC Peering

![VPC Peering](screenshots/VPC_Peering_boyang.png)

##### Chunxi VPC Peering

<img src="screenshots/VPC_Peering.png" alt="VPC Peering" style="zoom:60%;" />

##### Bo Zhang VPC Peering

<img src="screenshots/VPC_Peering_Brad.png" alt="VPC Peering" style="zoom:40%;" />

##### Marieth VPC Peering

<img src="screenshots/VPC_Peering_Marieth.png" alt="VPC Peering" style="zoom:40%;" />

#### 6.2.3 Security Group Rules

##### Bo Yang Security Group

<img src="screenshots/SecurityGroup_boyang.png" alt="Security Groups" style="zoom:40%;" />

##### Chunxi Security Group

![Security Groups](screenshots/SecurityGroup.png)

##### Bo Zhang Security Group

![Security Groups](screenshots/SecurityGroup_Brad.png)

##### Marieth Security Group

![Security Groups](screenshots/SecurityGroup_Marieth.png)



### 6.3 Terraform Execution Results

#### 6.3.1 Terraform output : boyang

![Terraform Output](screenshots/terraform_output_boyang.png)

#### 6.3.2 Terraform output : chunxi

![Terraform Output](screenshots/terraform_output_chunxi.png)

#### 6.3.3 Terraform output : brad

![Terraform Output](screenshots/terraform_output_brad.png)

#### 6.3.4 Terraform output : marieth

![Terraform Output](screenshots/terraform_output_marieth.png)
