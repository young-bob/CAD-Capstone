variable "region" {
  description = "AWS region"
  type        = string
  default     = "ca-central-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block (must not overlap with other accounts)"
  type        = string
}

variable "subnet_cidr" {
  description = "Public subnet CIDR block"
  type        = string
}

variable "role" {
  description = "Node role: gateway, api-1, api-2, data"
  type        = string
}

variable "owner_name" {
  description = "Team member name used for resource naming (e.g. chunxi, brad)"
  type        = string
}

variable "ami_id" {
  description = "AMI ID (Amazon Linux 2023 in ca-central-1)"
  type        = string
}

variable "instance_types" {
  description = "EC2 instance types for [node-1, node-2]"
  type        = list(string)
  default     = ["t4g.small", "t4g.small"]
}

variable "key_name" {
  description = "EC2 SSH key pair name"
  type        = string
}

variable "disk_size_gb" {
  description = "Root EBS volume size in GB"
  type        = number
  default     = 10
}

variable "enable_public_ip" {
  description = "Whether to assign public IPs to instances"
  type        = bool
  default     = true
}

variable "enable_iam" {
  description = "Whether to create IAM role with Bedrock access (set false if account lacks IAM permissions)"
  type        = bool
  default     = true
}

variable "enable_eip" {
  description = "Whether to attach an Elastic IP to node[0] (gateway)"
  type        = bool
  default     = false
}

variable "enable_http" {
  description = "Whether to open HTTP(80) and HTTPS(443) from the internet (gateway only)"
  type        = bool
  default     = false
}
