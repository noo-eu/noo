output "dns_records" {
  description = "The DNS records that should be created for the nodes."

  value = [
    { name = "monitoring", value = hcloud_server.monitoring.network.*.ip[0] },
    { name = "postgres-1", value = hcloud_server.postgres_nodes[0].network.*.ip[0] },
    { name = "postgres-2", value = hcloud_server.postgres_nodes[1].network.*.ip[0] },
    { name = "postgres-3", value = hcloud_server.postgres_nodes[2].network.*.ip[0] },
    { name = "node-1", value = hcloud_server.app_nodes[0].network.*.ip[0] },
    { name = "node-2", value = hcloud_server.app_nodes[1].network.*.ip[0] },
    { name = "kube", value = [
        hcloud_server.postgres_nodes[0].network.*.ip[0],
        hcloud_server.postgres_nodes[1].network.*.ip[0],
        hcloud_server.postgres_nodes[2].network.*.ip[0],
    ]},
    { name = "ingress", value = [
        hcloud_load_balancer.ingress_lb.ipv4,
        hcloud_load_balancer.ingress_lb.ipv6,
    ]}
  ]
}
