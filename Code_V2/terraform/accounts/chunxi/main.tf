# ============================================================
# Chunxi — Gateway (Nginx LB + Web Frontend + MinIO)
# VPC CIDR: 10.16.0.0/16
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
  profile = "chunxi"
}

module "node" {
  source = "../../modules/vsms-node"

  region       = var.region
  vpc_cidr     = "10.16.0.0/16"
  subnet_cidr  = "10.16.1.0/24"
  role         = "gateway"
  owner_name   = "chunxi"
  ami_id       = var.ami_id
  key_name     = var.key_name
  disk_size_gb = 30  # Extra disk for MinIO file storage
  enable_iam   = false  # Account lacks IAM permissions
  enable_eip   = true   # Gateway needs static public IP
  enable_http  = true   # Gateway exposes HTTP/HTTPS
}

# EC2 #1: Nginx LB + Web Frontend
# EC2 #2: MinIO (S3 Object Storage)

output "vpc_id"         { value = module.node.vpc_id }
output "account_id"     { value = data.aws_caller_identity.current.account_id }
output "route_table_id" { value = module.node.route_table_id }
output "public_ips"     { value = module.node.public_ips }
output "private_ips"    { value = module.node.private_ips }
output "eip"            { value = module.node.eip_public_ip }

data "aws_caller_identity" "current" {}
