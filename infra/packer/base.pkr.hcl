packer {
  required_plugins {
    hcloud = {
      source  = "github.com/hetznercloud/hcloud"
      version = "~> 1"
    }
    ansible = {
      source  = "github.com/hashicorp/ansible"
      version = "~> 1"
    }
  }
}

variable "hcloud_token" {
  description = "Hetzner Cloud API token"
  type    = string
}

variable "ssh_username" {
  type    = string
  default = "root"
}

source "hcloud" "debian12" {
  token          = var.hcloud_token
  server_type    = "cax11"
  image          = "debian-12"
  location       = "nbg1"
  ssh_username   = var.ssh_username
  snapshot_name  = "noo-debian12-base-${formatdate("YYYYMMDD", timestamp())}"
  ssh_timeout    = "5m"

  snapshot_labels = {
    "name" = "noo-debian12-base-${formatdate("YYYYMMDD", timestamp())}"
  }
}

build {
  name    = "debian12-hetzner-ansible"
  sources = ["source.hcloud.debian12"]

  provisioner "ansible" {
    playbook_file = "../playbooks/base.yml"

    extra_arguments = [
      "--extra-vars",
      "base_build=true",
    ]
  }
}
