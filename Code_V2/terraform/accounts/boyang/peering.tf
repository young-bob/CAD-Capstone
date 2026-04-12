# ============================================================
# Boyang — Full Mesh Peering (initiates 3 connections)
# boyang → chunxi, brad, marieth
# ============================================================

locals {
  peering_enabled = var.chunxi_vpc_id != "" && var.brad_vpc_id != "" && var.marieth_vpc_id != ""
}

# ---- boyang → chunxi ----
resource "aws_vpc_peering_connection" "to_chunxi" {
  count         = local.peering_enabled ? 1 : 0
  vpc_id        = module.node.vpc_id
  peer_vpc_id   = var.chunxi_vpc_id
  peer_owner_id = var.chunxi_account_id
  peer_region   = var.region
  auto_accept   = false
  tags          = { Name = "boyang-chunxi" }
}

resource "aws_route" "to_chunxi" {
  count                     = local.peering_enabled ? 1 : 0
  route_table_id            = module.node.route_table_id
  destination_cidr_block    = "10.16.0.0/16"
  vpc_peering_connection_id = aws_vpc_peering_connection.to_chunxi[0].id
}

# ---- boyang → brad ----
resource "aws_vpc_peering_connection" "to_brad" {
  count         = local.peering_enabled ? 1 : 0
  vpc_id        = module.node.vpc_id
  peer_vpc_id   = var.brad_vpc_id
  peer_owner_id = var.brad_account_id
  peer_region   = var.region
  auto_accept   = false
  tags          = { Name = "boyang-brad" }
}

resource "aws_route" "to_brad" {
  count                     = local.peering_enabled ? 1 : 0
  route_table_id            = module.node.route_table_id
  destination_cidr_block    = "10.17.0.0/16"
  vpc_peering_connection_id = aws_vpc_peering_connection.to_brad[0].id
}

# ---- boyang → marieth ----
resource "aws_vpc_peering_connection" "to_marieth" {
  count         = local.peering_enabled ? 1 : 0
  vpc_id        = module.node.vpc_id
  peer_vpc_id   = var.marieth_vpc_id
  peer_owner_id = var.marieth_account_id
  peer_region   = var.region
  auto_accept   = false
  tags          = { Name = "boyang-marieth" }
}

resource "aws_route" "to_marieth" {
  count                     = local.peering_enabled ? 1 : 0
  route_table_id            = module.node.route_table_id
  destination_cidr_block    = "10.19.0.0/16"
  vpc_peering_connection_id = aws_vpc_peering_connection.to_marieth[0].id
}

output "peering_id_to_chunxi"  { value = local.peering_enabled ? aws_vpc_peering_connection.to_chunxi[0].id : "" }
output "peering_id_to_brad"    { value = local.peering_enabled ? aws_vpc_peering_connection.to_brad[0].id : "" }
output "peering_id_to_marieth" { value = local.peering_enabled ? aws_vpc_peering_connection.to_marieth[0].id : "" }
