# Kubernetes nodes

This Terraform configuration manages the servers that make up the Kubernetes cluster

## Usage

### 1. Prepare the age key to decrypt the necessary secrets

The Terraform configuration in this directory makes use of the secrets stored in [/secrets.yml](/secrets.yml).

For Terraform to be able to use these secrets, the age key must be set in the environment. Please follow the steps in the [SOPS/age guide](/docs/early-secrets.md#usage) to _securely_ set the age key in your environment.

### 2. Obtain S3 credentials

To work on the terraform state file stored in Hetzner Object Storage you must extract S3 credentials from the secrets.yml file:

```bash
export AWS_ACCESS_KEY_ID=$(sops -d --extract '["aws_access_key_id"]' ../secrets.yml)
export AWS_SECRET_ACCESS_KEY=$(sops -d --extract '["aws_secret_access_key"]' ../secrets.yml)
export AWS_SSE_CUSTOMER_KEY=$(sops -d --extract '["aws_sse_customer_key"]' ../secrets.yml)
```

### 3. Run Terraform

```bash
terraform init && terraform plan -out=tfplan
```

Review the plan and apply it:

```bash
terraform apply tfplan
```
