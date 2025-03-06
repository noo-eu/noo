# The noo private network

This document outlines our network layout and the infrastructure that supports it.

## Network layout

We use the 10.0.0.0/8 private IP range for our network. This range is carved into smaller networks that help us organize our infrastructure.

In particular:

| Bits  | Network size | Description        |
|-------|--------------|--------------------|
| 0-7   | /8           | Fixed, constant 10 |
| 8-11  | /12          | Network provider   |
| 12-15 | /16          | Region, DC         |
| 16-19 | /20          | Environment        |
| 21-23 | /24          | Subnet (optional)  |
| 20-31 | /32          | Hosts              |

For example an IP `10.0.32.5` can be decoded to be:

```
00001010 . 0000 0000 . 0010 0000 . 00000101
```

- Provider 0: Hetzner
- Region 0: EU
- Environment 2: Staging
- Host 5

### Providers

| ID | Name                                                |
|----|-----------------------------------------------------|
| 0  | Hetzner                                             |
| 6  | Reserved for Kubernetes Service CIDR (10.96.0.0/12) |
| 7  | Reserved for WireGuard clients                      |

### Regions

The region allocation can vary by provider. For Hetzner, we have:

| ID | Name   |
|----|--------|
| 0  | Europe |

### Environments

| ID | Name          |
|----|---------------|
| 0  | Control plane |
| 1  | Production    |
| 2  | Staging       |

### WireGuard clients

Note that WireGuard clients (10.224.0.0/11) don't use regions or environments. They are all in the same network.

Also IPs 10.255.255.253 and 10.255.255.254 are reserved for emergency access to the private network through a WireGuard backdoor.

## Currently defined networks

| Network                 | CIDR           | Description                  |
|-------------------------|----------------|------------------------------|
| noo-hc-eu-control-plane | 10.0.0.0/17    | Hetzner Europe control plane |
| noo-hc-eu-production    | 10.0.16.0/17   | Hetzner Europe production    |
| Kubernetes pods         | 192.168.0.0/16 | Kubernetes pods              |