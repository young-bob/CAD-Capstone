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

# ---- Peer variables ----

variable "peering_id_from_boyang" {
  description = "Peering ID from boyang → brad"
  type        = string
  default     = ""
}

variable "peering_id_from_chunxi" {
  description = "Peering ID from chunxi → brad"
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
