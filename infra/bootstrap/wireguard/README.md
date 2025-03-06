# Bootstrap WireGuard gateway

This document describes the deployment of a **temporary WireGuard server** on the edge of our private network. It enables secure access to internal servers *before* the permanent WireGuard-based network is established.

This temporary server runs in Hetzner, with a Public IP, and attached to the private network. No SSH access is allowed, the server is hermetically locked down to only serve one purpose and be disposable.

Besides being used to work around the bootstrapping problem, this server can also be used as an **emergency access path** to the private network, should the main WireGuard server fail or be unreachable.

Once the server has finished configuring itself, it will publish a message on one of our messaging channels, providing a copy-paste configuration for the WireGuard client (minus the private key).

This server is not part of the permanent infra and **must be removed** once it has served its purpose.

## Usage

### 1. Create a key pair

Generate your own private key and public key pair for your device. You need to have installed `wireguard` tools on your machine.

```bash
wg genkey | tee wg.private | wg pubkey
```

Keep your private key safe and secret and take note of the public key.

### 2. Prepare the age key to decrypt the necessary secrets

The Terraform configuration in this directory makes use of the secrets stored in [/secrets.yml](/secrets.yml).

For Terraform to be able to use these secrets, the age key must be set in the environment. Please follow the steps in the [SOPS/age guide](/docs/early-secrets.md#usage) to _securely_ set the age key in your environment.

### 3. Run Terraform

```
terraform init && terraform apply
```

You will be asked for:

1. Your public key from the previous step.
2. Your name or handle to identify yourself in the notification message.
3. An API token for Hetzner Cloud. You can create one [here](https://console.hetzner.cloud/projects/3538715/security/tokens).

You can also set additional variables to define:

- `private_network_name`: the name of the private network that the server will be attached to. Default is `noo-private1`.
- `webhook_url`: the URL to send the WireGuard configuration to. Defaults to the `#infra-notifications` channel in Discord.
- `location`: the Hetzner datacenter location to deploy the server. Default is `nbg1`.
- `server_type`: the server type to deploy. Default is `cax11` (a small ARM server).
- `server_name`: the name of the server. Default is `wireguard-backdoor`.

### 4. Configure your WireGuard client

The server will output a configuration file for your WireGuard client. It will look like this:

```ini
[Interface]
PrivateKey = <your private key>
Address = ...

[Peer]
PublicKey = ...
AllowedIPs = ...
Endpoint = ...
```

Save this configuration to a file, replacing the placeholder with the private key you generated before and either:

- Run `sudo wg-quick up ./path/to/config/file.conf` to start the WireGuard connection.
- Import the configuration in whatever WireGuard client you are using. The Ubuntu network manager has a built-in WireGuard client that you can use.

### 5. Connect & profit

Once you have the WireGuard client running, you should be able to access the private network.

Do your work, and once you are done, remember to...

### 6. Destroy the server:

```
terraform destroy
```
