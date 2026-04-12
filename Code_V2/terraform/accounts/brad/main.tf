# ============================================================
# Brad — API Cluster 1 (Silo 1 + Silo 2)
# VPC CIDR: 10.17.0.0/16
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
  profile = "brad"
}

module "node" {
  source = "../../modules/vsms-node"

  region       = var.region
  vpc_cidr     = "10.17.0.0/16"
  subnet_cidr  = "10.17.1.0/24"
  role         = "api-1"
  owner_name   = "brad"
  ami_id       = var.ami_id
  key_name     = var.key_name
  disk_size_gb = 30
}

# EC2 #1: API Silo 1
# EC2 #2: API Silo 2

output "vpc_id"         { value = module.node.vpc_id }
output "account_id"     { value = data.aws_caller_identity.current.account_id }
output "route_table_id" { value = module.node.route_table_id }
output "public_ips"     { value = module.node.public_ips }
output "private_ips"    { value = module.node.private_ips }

data "aws_caller_identity" "current" {}
