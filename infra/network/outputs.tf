output "dns_records" {
  description = "The DNS records that should be created for the nodes."

  value = [
    { name = "service", value = hcloud_server.production_service.network.*.ip[0] },
    { name = "tang", value = hcloud_server.production_service.network.*.ip[0] },
  ]
}
