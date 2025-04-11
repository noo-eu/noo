data "hcloud_network" "production" {
  name     = "noo-hc-eu-production"
}

data "hcloud_image" "noo_debian12_base" {
  with_selector = "name=noo-debian12-base-20250410"
  with_architecture = "arm"
}

// Prevent postgres nodes from ending up on the same physical machine.
resource "hcloud_placement_group" "postgres" {
  name = "Postgres"
  type = "spread"
}

// Prevent ingress nodes from ending up on the same physical machine.
resource "hcloud_placement_group" "ingress" {
  name = "Ingress"
  type = "spread"
}

/**
 * Start the postgres nodes.
 * These are special, in that they have a volume attached to them.
 */
resource "hcloud_server" "postgres_nodes" {
  count       = 3

  name        = "noo-hc-eu-postgres-${count.index + 1}"
  image       = data.hcloud_image.noo_debian12_base.id
  server_type = "cax11"
  location    = count.index == 2 ? "hel1" : "nbg1"

  // The node in helsinki does not need a placement group.
  placement_group_id = count.index == 2 ? null : hcloud_placement_group.postgres.id

  network {
    network_id = data.hcloud_network.production.id
    // .1 is the router, .2 is the nat
    ip = "10.0.16.${count.index + 3}"
    alias_ips = []
  }

  public_net {
    ipv4_enabled = false
    ipv6_enabled = false
  }

  user_data = templatefile("${path.module}/userdata.yml.tpl", {
    hostname = "postgres-${count.index + 1}"
    domain = "internal.noo.eu"
  })
}

resource "hcloud_volume" "postgres" {
  count     = 3
  name      = "noo-hc-eu-postgres-${count.index + 1}"
  size      = 50
  server_id = hcloud_server.postgres_nodes[count.index].id
  automount = false
}

/**
 * Start the app nodes.
 */
resource "hcloud_server" "app_nodes" {
  count       = 2

  name        = "noo-hc-eu-app-${count.index + 1}"
  image       = data.hcloud_image.noo_debian12_base.id
  server_type = "cax11"
  location    = "nbg1"

  placement_group_id = hcloud_placement_group.ingress.id

  network {
    network_id = data.hcloud_network.production.id
    alias_ips = []
    ip = "10.0.16.${count.index + 6}"
  }

  public_net {
    ipv4_enabled = false
    ipv6_enabled = false
  }

  user_data = templatefile("${path.module}/userdata.yml.tpl", {
    hostname = "node-${count.index + 1}"
    domain = "internal.noo.eu"
  })
}

/**
 * Start the monitoring node.
 * This is also getting a volume.
 */
resource "hcloud_server" "monitoring" {
  name        = "noo-hc-eu-monitoring"
  image       = data.hcloud_image.noo_debian12_base.id
  server_type = "cax11"
  location    = "nbg1"

  network {
    network_id = data.hcloud_network.production.id
    alias_ips = []
    ip = "10.0.16.8"
  }

  public_net {
    ipv4_enabled = false
    ipv6_enabled = false
  }

  user_data = templatefile("${path.module}/userdata.yml.tpl", {
    hostname = "monitoring"
    domain = "internal.noo.eu"
  })
}

resource "hcloud_volume" "monitoring" {
  name      = "noo-hc-eu-monitoring"
  size      = 50
  server_id = hcloud_server.monitoring.id
  automount = false
}
