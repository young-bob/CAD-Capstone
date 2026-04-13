# ============================================================
# VSMS — Reusable VPC + EC2 Module
# ============================================================
# Creates a VPC with public subnet, 2 EC2 instances,
# and security groups configured for VSMS services.
# ============================================================

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ==================== VPC ====================

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.owner_name}-vpc"
  }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.owner_name}-igw"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.subnet_cidr
  map_public_ip_on_launch = var.enable_public_ip
  availability_zone       = "${var.region}a"

  tags = {
    Name = "${var.owner_name}-public"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  # NOTE: Do NOT use inline 'route' blocks here.
  # Peering routes are managed by separate aws_route resources in peering.tf.
  # Inline routes conflict with external aws_route resources and will delete them on update.

  tags = {
    Name = "${var.owner_name}-rt"
  }
}

resource "aws_route" "igw" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.gw.id
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# ==================== Security Group ====================

resource "aws_security_group" "vsms" {
  name_prefix = "${var.owner_name}-"
  vpc_id      = aws_vpc.main.id
  description = "VSMS ${var.owner_name} security group"

  # WireGuard VPN
  ingress {
    from_port   = 51822
    to_port     = 51822
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "WireGuard VPN"
  }

  # HTTP (only gateway)
  dynamic "ingress" {
    for_each = var.enable_http ? [1] : []
    content {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP"
    }
  }

  # HTTPS (only gateway)
  dynamic "ingress" {
    for_each = var.enable_http ? [1] : []
    content {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS"
    }
  }

  # Allow ALL traffic from peered VPCs (10.16.0.0/14 covers 10.16–10.19)
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.16.0.0/14"]
    description = "All traffic from peered VPCs"
  }

  # Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.owner_name}-sg"
  }
}

# ==================== IAM (Bedrock Access) ====================

resource "aws_iam_role" "ec2" {
  count = var.enable_iam ? 1 : 0
  name  = "${var.owner_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${var.owner_name}-ec2-role" }
}

resource "aws_iam_role_policy_attachment" "bedrock" {
  count      = var.enable_iam ? 1 : 0
  role       = aws_iam_role.ec2[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonBedrockFullAccess"
}

resource "aws_iam_instance_profile" "ec2" {
  count = var.enable_iam ? 1 : 0
  name  = "${var.owner_name}-ec2-profile"
  role  = aws_iam_role.ec2[0].name
}

# ==================== EC2 Instances ====================

resource "aws_instance" "node" {
  count = 2

  ami                    = var.ami_id
  instance_type          = var.instance_types[count.index]
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.vsms.id]
  key_name               = var.key_name
  iam_instance_profile   = var.enable_iam ? aws_iam_instance_profile.ec2[0].name : null

  root_block_device {
    volume_size = var.disk_size_gb
    volume_type = "gp3"
  }

  user_data = <<-EOF
    #!/bin/bash
    set -e

    # Set hostname to match EC2 Name tag
    hostnamectl set-hostname "${var.owner_name}_${count.index + 1}"

    # Suppress interactive prompts
    export DEBIAN_FRONTEND=noninteractive

    # Update system (Debian 13)
    apt-get update && apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"

    # Install Podman + dependencies
    apt-get install -y podman python3-pip curl git
    pip3 install podman-compose --break-system-packages

    # Tag the instance
    echo "VSMS_ROLE=${var.role}" >> /etc/environment
    echo "VSMS_NODE=${count.index + 1}" >> /etc/environment
    echo "VSMS_OWNER=${var.owner_name}" >> /etc/environment

    echo "✅ ${var.owner_name}_${count.index + 1} ready"
  EOF

  tags = {
    Name = "${var.owner_name}_${count.index + 1}"
    Role = var.role
  }
}

# ==================== Elastic IP (optional, for gateway) ====================

resource "aws_eip" "node" {
  count    = var.enable_eip ? 1 : 0
  instance = aws_instance.node[0].id
  domain   = "vpc"

  tags = { Name = "${var.owner_name}_1-eip" }
}
