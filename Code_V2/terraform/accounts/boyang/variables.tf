variable "region" {
  default = "ca-central-1"
}

variable "ami_id" {
  description = "Debian 13 ARM64 AMI in ca-central-1"
  type        = string
}

variable "key_name" {
  description = "Your EC2 key pair name"
  type        = string
}

# ---- Peer variables (boyang initiates ALL peering) ----

variable "chunxi_vpc_id" {
  description = "Chunxi's VPC ID"
  type        = string
  default     = ""
}

variable "chunxi_account_id" {
  description = "Chunxi's AWS Account ID"
  type        = string
  default     = ""
}

variable "brad_vpc_id" {
  description = "Brad's VPC ID"
  type        = string
  default     = ""
}

variable "brad_account_id" {
  description = "Brad's AWS Account ID"
  type        = string
  default     = ""
}

variable "marieth_vpc_id" {
  description = "Marieth's VPC ID"
  type        = string
  default     = ""
}

variable "marieth_account_id" {
  description = "Marieth's AWS Account ID"
  type        = string
  default     = ""
}
