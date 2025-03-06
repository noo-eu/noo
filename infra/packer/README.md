# Building noo base images

We use [Hashicorp Packer](https://www.packer.io/) to build our base images.

## Usage

Install Packer to get started. You can do this on macOS or Ubuntu/Debian with Homebrew:

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/packer
```

Or on Ubuntu with `apt`:

```bash
wget -O - https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install packer
```

If you're executing from a macOS environment you must:

```bash
brew install gnu-tar
```

As it is required by the prometheus node-exporter installation role.

### 1. Prepare the age key to decrypt the necessary secrets

The Packer configuration in this directory makes use of a secret stored in [/secrets.yml](/secrets.yml).

Unfortunately, Packer does not directly support SOPS. To work around this we need to extract the secret in an environment variable.

Prepare your shell as defined in the [SOPS/age guide](/docs/early-secrets.md#usage).

Then load the secret into an environment variable:

```bash
export HCLOUD_TOKEN=$(sops -d --extract '["hcloud_api_token"]' ../secrets.yml)
```

### 2. Run Packer

```bash
packer init .
packer build .
```
