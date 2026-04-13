# ============================================================
# Marieth — Data Layer (PostgreSQL + API Silo 5)
# VPC CIDR: 10.19.0.0/16
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
  profile = "marieth"
}

module "node" {
  source = "../../modules/vsms-node"

  region         = var.region
  vpc_cidr       = "10.19.0.0/16"
  subnet_cidr    = "10.19.1.0/24"
  role           = "data"
  owner_name     = "marieth"
  ami_id         = var.ami_id
  key_name       = var.key_name
  instance_types = ["t4g.small", "t4g.small"]  # Free Tier restriction
  disk_size_gb   = 30
  enable_iam     = true
}

# EC2 #1: PostgreSQL 17
# EC2 #2: API Silo 5

output "vpc_id"         { value = module.node.vpc_id }
output "account_id"     { value = data.aws_caller_identity.current.account_id }
output "route_table_id" { value = module.node.route_table_id }
output "public_ips"     { value = module.node.public_ips }
output "private_ips"    { value = module.node.private_ips }

data "aws_caller_identity" "current" {}
