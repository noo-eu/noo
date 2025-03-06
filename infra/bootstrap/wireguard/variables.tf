variable "admin_public_key" {
  description = "The WireGuard public key of the admin"
  type        = string
}

variable "admin_name" {
  description = "Who is responsible for the server"
  type        = string
}

variable "private_network_name" {
  description = "The name of the network to attach the server to"
  type        = string
  default     = "noo-hc-eu-production"
}

variable "server_name" {
  description = "The name of the server"
  type        = string
  default     = "wireguard-backdoor"
}

variable "server_type" {
  description = "The server type"
  type        = string
  default     = "cax11"
}

variable "location" {
  description = "The geographic location of the server"
  type        = string
  default     = "nbg1"
}

variable "webhook_url" {
  description = "The URL to send a webhook to when the server is ready. Leave empty to use the default encrypted value from SOPS."
  type        = string
  default     = ""
}
