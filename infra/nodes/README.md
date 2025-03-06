# The noo control plane

This Terraform configuration manages the servers used by the control plane of noo.

The control plane is a suite of auxiliary services that help us manage noo. It includes:

- [Hashicorp Vault](https://www.vaultproject.io/):
    Vault is used to store secrets, manage access to them, to manage the PKI infrastructure and SSH CA.
- [Hashicorp Consul](https://www.consul.io/):
    We use Consul for private service discovery (a fancy DNS), as a storage backend for Vault and for other coordination tasks.
- [Netmaker](https://www.netmaker.io):
    Netmaker is a WireGuard-based VPN that allows us to connect all the servers in the private network. It can also be used to establish secure connectivity between private networks, for example in different cloud providers.
- [AWX](https://github.com/ansible/awx):
    We use it to run Ansible playbooks in a controlled and auditable way.
- [Prometheus](https://prometheus.io/):
    Prometheus is used to monitor the infrastructure and applications.
- [Grafana](https://grafana.com/):
    Grafana is used to visualize the data collected by Prometheus.
- [Tang](https://github.com/latchset/tang):
    Tang is a network-bound encryption key server that we use to securely encrypt and decrypt arbitrary data within the private network.

At some point, each of these services will have its own server(s) and dedicated, highly available infrastructure. For now, and until we can afford to do so, we run them all on the same server. Which just means we have to be more careful with backups and monitoring.

## Usage

### 1. Prepare the age key to decrypt the necessary secrets

The Terraform configuration in this directory makes use of the secrets stored in [/secrets.yml](/secrets.yml).

For Terraform to be able to use these secrets, the age key must be set in the environment. Please follow the steps in the [SOPS/age guide](/docs/early-secrets.md#usage) to _securely_ set the age key in your environment.

### 2. Run Terraform

```bash
terraform init && terraform plan -out=tfplan
```

Review the plan and apply it:

```bash
terraform apply tfplan
```
