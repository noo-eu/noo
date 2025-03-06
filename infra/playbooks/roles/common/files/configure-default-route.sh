#!/bin/bash

# This script is intended for use in cloud environments where instances may be
# provisioned without a public IPv4 address (private network only). In such
# cases, a default route to the gateway is required for outbound internet
# access.
#
# Behavior:
# - If the instance has no public IPv4 address (only private 10.x.x.x),
# - Then fetch the gateway IP from the metadata service,
# - And set the default route via that gateway.
#
# There is an underlying assumption that the gateway IP is a cloud router that
# is configured to eventually route traffic to the internet. Also that the
# instance is linked to a single private network (if multiple, the script will
# pick the first one).
#
# For example, in the Hetzner cloud, you can set a Route to 0.0.0.0/0 via a
# 10.0.0.2 instance that acts as a NAT gateway. In this case, by setting the
# default route on other machines to be 10.0.0.1, they can reach the NAT gateway
# and eventually the internet.
#
# This script is safe to be run even on machines that have a public IPv4 address
# as it will exit early.

set -euo pipefail

if ip -4 addr show scope global | grep "^\s*inet " | grep -vq "inet 10\."; then
  echo "Public IPv4 address found, exiting."
  exit 0
fi

# Wait up to 10 seconds for a route to 169.254.169.254 to appear
for i in {1..10}; do
  if ip route | grep -q "169.254.169.254"; then
    break
  fi
  sleep 1
done

# Fetch the gateway IP from the metadata service
metadata_url="http://169.254.169.254/latest/meta-data/private-networks"
for i in {1..10}; do
  metadata=$(curl -fs "$metadata_url") && break
  sleep 1
done

if [ -z "${metadata:-}" ]; then
  echo "[WARN] Could not fetch Hetzner private network metadata after retries."
  exit 1
fi

# Extract the gateway IP(s) from the metadata
gateway=$(echo "$metadata" | awk '/gateway:/ {print $2}')
if [ -z "$gateway" ]; then
  echo "[WARN] Could not extract gateway IP from metadata."
  exit 1
fi

# Ensure we only pick the first gateway IP
gateway_ip=$(echo "$gateway" | head -n 1)

# Set the default route via the gateway
ip route replace default via "$gateway_ip"
echo "[INFO] Default route configured via $gateway"
