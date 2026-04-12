# ============================================================
# Marieth — Full Mesh Peering (accepts all 3)
# Accept from boyang, chunxi, brad
# ============================================================

# ---- Accept: boyang → marieth ----
resource "aws_vpc_peering_connection_accepter" "from_boyang" {
  count                     = var.peering_id_from_boyang != "" ? 1 : 0
  vpc_peering_connection_id = var.peering_id_from_boyang
  auto_accept               = true
  tags                      = { Name = "boyang-marieth" }
}

resource "aws_route" "to_boyang" {
  count                     = var.peering_id_from_boyang != "" ? 1 : 0
  route_table_id            = module.node.route_table_id
  destination_cidr_block    = "10.18.0.0/16"
  vpc_peering_connection_id = var.peering_id_from_boyang
}

# ---- Accept: chunxi → marieth ----
resource "aws_vpc_peering_connection_accepter" "from_chunxi" {
  count                     = var.peering_id_from_chunxi != "" ? 1 : 0
  vpc_peering_connection_id = var.peering_id_from_chunxi
  auto_accept               = true
  tags                      = { Name = "chunxi-marieth" }
}

resource "aws_route" "to_chunxi" {
  count                     = var.peering_id_from_chunxi != "" ? 1 : 0
  route_table_id            = module.node.route_table_id
  destination_cidr_block    = "10.16.0.0/16"
  vpc_peering_connection_id = var.peering_id_from_chunxi
}

# ---- Accept: brad → marieth ----
resource "aws_vpc_peering_connection_accepter" "from_brad" {
  count                     = var.peering_id_from_brad != "" ? 1 : 0
  vpc_peering_connection_id = var.peering_id_from_brad
  auto_accept               = true
  tags                      = { Name = "brad-marieth" }
}

resource "aws_route" "to_brad" {
  count                     = var.peering_id_from_brad != "" ? 1 : 0
  route_table_id            = module.node.route_table_id
  destination_cidr_block    = "10.17.0.0/16"
  vpc_peering_connection_id = var.peering_id_from_brad
}
