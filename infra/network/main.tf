/* Create the production network & subnet */
resource "hcloud_network" "production" {
  name     = "noo-hc-eu-production"
  ip_range = "10.0.16.0/20"
}

resource "hcloud_network_subnet" "production_1" {
  network_id   = hcloud_network.production.id
  type         = "cloud"
  ip_range     = cidrsubnet(hcloud_network.production.ip_range, 3, 0)
  network_zone = "eu-central"
}

/* Fetch the base image for the production service */
data "hcloud_image" "noo_debian12_base" {
  with_selector = "name=noo-debian12-base"
  with_architecture = "arm"
}

/**
 * Create a NAT server for the production network.
 * Note, this will temporarily host Tang as well.
 */
resource "hcloud_server" "production_service" {
  depends_on = [ hcloud_network_subnet.production_1 ]

  name        = "noo-hc-eu-production-1-service"
  image       = data.hcloud_image.noo_debian12_base.id
  server_type = "cax11"
  location    = "nbg1"

  network {
    network_id = hcloud_network.production.id
  }

  public_net {
    ipv4_enabled = true
    ipv6_enabled = false
  }

  user_data = templatefile("${path.module}/userdata.yml.tpl", {
    hostname = "service"
    domain = "internal.noo.eu"
  })
}

/* Create a default route for the production network */
resource "hcloud_network_route" "production_default" {
  network_id = hcloud_network.production.id
  destination = "0.0.0.0/0"
  gateway = one(hcloud_server.production_service.network[*].ip)
}