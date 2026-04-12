# ============================================================
# Chunxi — Full Mesh Peering
# Accept from boyang, initiate to brad + marieth
# ============================================================

# ---- Accept: boyang → chunxi ----
resource "aws_vpc_peering_connection_accepter" "from_boyang" {
  count                     = var.peering_id_from_boyang != "" ? 1 : 0
  vpc_peering_connection_id = var.peering_id_from_boyang
  auto_accept               = true
  tags                      = { Name = "boyang-chunxi" }
}

resource "aws_route" "to_boyang" {
  count                     = var.peering_id_from_boyang != "" ? 1 : 0
  route_table_id            = module.node.route_table_id
  destination_cidr_block    = "10.18.0.0/16"
  vpc_peering_connection_id = var.peering_id_from_boyang
}

# ---- Initiate: chunxi → brad ----
resource "aws_vpc_peering_connection" "to_brad" {
  count         = var.brad_vpc_id != "" ? 1 : 0
  vpc_id        = module.node.vpc_id
  peer_vpc_id   = var.brad_vpc_id
  peer_owner_id = var.brad_account_id
  peer_region   = var.region
  auto_accept   = false
  tags          = { Name = "chunxi-brad" }
}

resource "aws_route" "to_brad" {
  count                     = var.brad_vpc_id != "" ? 1 : 0
  route_table_id            = module.node.route_table_id
  destination_cidr_block    = "10.17.0.0/16"
  vpc_peering_connection_id = aws_vpc_peering_connection.to_brad[0].id
}

# ---- Initiate: chunxi → marieth ----
resource "aws_vpc_peering_connection" "to_marieth" {
  count         = var.marieth_vpc_id != "" ? 1 : 0
  vpc_id        = module.node.vpc_id
  peer_vpc_id   = var.marieth_vpc_id
  peer_owner_id = var.marieth_account_id
  peer_region   = var.region
  auto_accept   = false
  tags          = { Name = "chunxi-marieth" }
}

resource "aws_route" "to_marieth" {
  count                     = var.marieth_vpc_id != "" ? 1 : 0
  route_table_id            = module.node.route_table_id
  destination_cidr_block    = "10.19.0.0/16"
  vpc_peering_connection_id = aws_vpc_peering_connection.to_marieth[0].id
}

output "peering_id_to_brad"    { value = var.brad_vpc_id != "" ? aws_vpc_peering_connection.to_brad[0].id : "" }
output "peering_id_to_marieth" { value = var.marieth_vpc_id != "" ? aws_vpc_peering_connection.to_marieth[0].id : "" }
