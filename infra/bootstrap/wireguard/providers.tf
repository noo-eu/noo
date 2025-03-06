terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }

    sops = {
      source  = "carlpett/sops"
      version = "~> 1.1"
    }
  }
}

provider "sops" {}

provider "hcloud" {
  token = data.sops_file.secrets.data.hcloud_api_token
}
