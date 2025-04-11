resource "hcloud_load_balancer" "ingress_lb" {
  name = "noo-hc-eu-ingress-lb"
  load_balancer_type = "lb11"
  location = "nbg1"
}

resource "hcloud_load_balancer_network" "ingress_lb_network" {
  load_balancer_id = hcloud_load_balancer.ingress_lb.id
  network_id       = data.hcloud_network.production.id
}

resource "hcloud_load_balancer_service" "tcp_80" {
  load_balancer_id = hcloud_load_balancer.ingress_lb.id
  protocol         = "tcp"
  listen_port      = 80
  destination_port = 80
  proxyprotocol = true
}

resource "hcloud_load_balancer_service" "tcp_443" {
  load_balancer_id = hcloud_load_balancer.ingress_lb.id
  protocol         = "tcp"
  listen_port      = 443
  destination_port = 443
  proxyprotocol = true
}


resource "hcloud_load_balancer_target" "ingress_targets" {
  count            = length(hcloud_server.app_nodes.*.id)
  
  type             = "server"
  load_balancer_id = hcloud_load_balancer.ingress_lb.id
  server_id        = hcloud_server.app_nodes[count.index].id
  use_private_ip   = true
}
