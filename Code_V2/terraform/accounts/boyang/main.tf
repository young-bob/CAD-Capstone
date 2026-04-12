# ============================================================
# Boyang — API Cluster 2 (Silo 3 + Silo 4)
# VPC CIDR: 10.18.0.0/16
# ============================================================

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = var.region
  profile = "default"
}

module "node" {
  source = "../../modules/vsms-node"

  region       = var.region
  vpc_cidr     = "10.18.0.0/16"
  subnet_cidr  = "10.18.1.0/24"
  role         = "api-2"
  owner_name   = "boyang"
  ami_id       = var.ami_id
  key_name     = var.key_name
  disk_size_gb = 30
  enable_eip   = true   # Bastion needs static public IP
}

# EC2 #1: API Silo 3 (Bastion — EIP for SSH)
# EC2 #2: API Silo 4

# SSH bastion: boyang_1 listens on 51522 externally, proxies to all nodes via port 22
resource "aws_security_group_rule" "ssh_bastion" {
  type              = "ingress"
  from_port         = 51522
  to_port           = 51522
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = module.node.security_group_id
  description       = "SSH bastion (external port)"
}

output "vpc_id"         { value = module.node.vpc_id }
output "account_id"     { value = data.aws_caller_identity.current.account_id }
output "route_table_id" { value = module.node.route_table_id }
output "public_ips"     { value = module.node.public_ips }
output "private_ips"    { value = module.node.private_ips }
output "eip"            { value = module.node.eip_public_ip }

data "aws_caller_identity" "current" {}
