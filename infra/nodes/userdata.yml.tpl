#cloud-config

hostname: ${hostname}
fqdn: ${hostname}.${domain}
manage_etc_hosts: true

ssh_deletekeys: true
ssh_genkeytypes: ['ed25519']
