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

# ---- Peer variables (accepts all 3) ----

variable "peering_id_from_boyang" {
  description = "Peering ID from boyang → marieth"
  type        = string
  default     = ""
}

variable "peering_id_from_chunxi" {
  description = "Peering ID from chunxi → marieth"
  type        = string
  default     = ""
}

variable "peering_id_from_brad" {
  description = "Peering ID from brad → marieth"
  type        = string
  default     = ""
}
