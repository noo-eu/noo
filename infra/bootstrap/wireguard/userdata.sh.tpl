#!/bin/bash

# Stop SSH service
systemctl disable sshd
systemctl stop sshd

# Enable IP forwarding
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
sysctl -p

# Determine our public IP address
PUBLIC_IP=$(ip -4 addr show dev eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}')

# Install WireGuard
apt-get update
apt-get install -y wireguard

# Generate WireGuard keys
wg genkey | tee privatekey | wg pubkey > publickey

# Create WireGuard configuration file
cat <<EOF > /etc/wireguard/wg0.conf
[Interface]
PrivateKey = $(cat privatekey)
Address = 10.255.255.254/8
ListenPort = 51820

[Peer]
PublicKey = ${admin_public_key}
AllowedIPs = 10.255.255.253/32
EOF

# Start the WireGuard peer
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

# Set up IP masquerading
iptables -t nat -A POSTROUTING -s 10.0.0.0/8 ! -o wg0 -j MASQUERADE

# Define the client configuration and place it in a variable, preserving newlines
CLIENT_CONFIG=$(cat <<EOF
[Interface]
PrivateKey = <your private key here>
Address = 10.255.255.253/8

[Peer]
PublicKey = $(cat publickey)
Endpoint = $${PUBLIC_IP}:51820
AllowedIPs = 10.0.0.0/8
EOF
)

# Prepare the message to send to the channel
MESSAGE=$(cat <<EOF
🛡️ WireGuard Backdoor Server Ready

Save this configuration to your local machine:

\`\`\`
$CLIENT_CONFIG
\`\`\`

Make sure to insert your private key in the configuration file. Then:

\`\`\`
sudo wg-quick up ./path/to/config/file.conf
\`\`\`

This server was requested by ${admin_name} and is now ready for use.
EOF
)

# Replace newlines with literal \n
MESSAGE=$(echo "$${MESSAGE}" | awk '{printf "%s\\n", $0}')

# Send the message to the channel
cat <<EOF | curl -X POST -H 'Content-Type: application/json' -d @- "${webhook_url}"
{
  "content": "$${MESSAGE}",
  "username": "WireGuard backdoor server",
  "avatar_url": "https://www.wireguard.com/img/icons/favicon-512.png"
}
EOF
