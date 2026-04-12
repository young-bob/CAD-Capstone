output "vpc_id" {
  description = "VPC ID for peering"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "route_table_id" {
  description = "Route table ID for adding peering routes"
  value       = aws_route_table.public.id
}

output "subnet_id" {
  description = "Public subnet ID"
  value       = aws_subnet.public.id
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.vsms.id
}

output "instance_ids" {
  description = "EC2 instance IDs"
  value       = aws_instance.node[*].id
}

output "public_ips" {
  description = "EC2 public IPs"
  value       = aws_instance.node[*].public_ip
}

output "private_ips" {
  description = "EC2 private IPs (used for peering communication)"
  value       = aws_instance.node[*].private_ip
}

output "eip_public_ip" {
  description = "Elastic IP address (if enabled)"
  value       = var.enable_eip ? aws_eip.node[0].public_ip : ""
}
