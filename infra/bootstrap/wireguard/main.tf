data "sops_file" "secrets" {
  source_file = "${path.module}/../../secrets.yml"
}

data "hcloud_network" "private" {
  name = var.private_network_name
}

locals {
  webhook_url = var.webhook_url != "" ? var.webhook_url : data.sops_file.secrets.data.infra_notifications_chat_webhook_url
}

resource "hcloud_server" "wireguard" {
  name        = var.server_name
  image       = "debian-12"
  server_type = var.server_type
  location    = var.location

  network {
    network_id = data.hcloud_network.private.id
  }

  user_data = templatefile("${path.module}/userdata.sh.tpl", {
    admin_public_key = var.admin_public_key
    admin_name = var.admin_name
    webhook_url = local.webhook_url
  })

  labels = {
    "operator" = var.admin_name
  }
}
