#cloud-config

hostname: ${hostname}
fqdn: ${hostname}.${domain}
manage_etc_hosts: true

ssh_deletekeys: true
ssh_genkeytypes: ['ed25519']

write_files:
  - path: /usr/local/bin/setup-nat-gateway.sh
    permissions: '0755'
    content: |
      #!/bin/bash

      # Detect interfaces
      PUB_IFACE=eth0
      PRIV_IFACE=$(ip -o link show | awk -F': ' '{print $2}' | grep -v lo | grep -v "$PUB_IFACE" | head -n1)

      PRIV_NET="10.0.0.0/8"
      BEFORE_RULES="/etc/ufw/before.rules"

      # Enable IP forwarding
      echo "net.ipv4.ip_forward=1" > /etc/sysctl.d/99-noo.conf
      sysctl -p /etc/sysctl.d/99-noo.conf

      # Set UFW default forward policy
      sed -i 's/^DEFAULT_FORWARD_POLICY=.*/DEFAULT_FORWARD_POLICY="ACCEPT"/' /etc/default/ufw

      # Insert NAT block if not already there
      if ! grep -q "^-A POSTROUTING -s $PRIV_NET -o $PUB_IFACE -j MASQUERADE" "$BEFORE_RULES"; then
          sed -i "1i*nat\n:POSTROUTING ACCEPT [0:0]\n-A POSTROUTING -s $PRIV_NET -o $PUB_IFACE -j MASQUERADE --random-fully\nCOMMIT\n" "$BEFORE_RULES"
      fi

      # Enable and reload UFW
      ufw --force disable
      ufw --force enable

  - path: /etc/systemd/system/setup-nat.service
    permissions: '0644'
    content: |
      [Unit]
      Description=Setup NAT Gateway
      After=network-online.target
      Wants=network-online.target

      [Service]
      Type=oneshot
      ExecStart=/usr/local/bin/setup-nat-gateway.sh
      RemainAfterExit=true

      [Install]
      WantedBy=multi-user.target

runcmd:
  - systemctl daemon-reexec
  - systemctl daemon-reload
  - systemctl enable setup-nat.service
  - systemctl start setup-nat.service
