# Managing Secrets outside of Hashicorp Vault

This document outlines how we handle sensitive data (secrets) **before**
Kubernetes Secrets can be used.

These secrets are used for initial infrastructure deployment and emergency operations. 

## Secrets that fit here

Examples of secrets we handle during early bootstrapping:

- Static **root credentials** for Kubernetes itself
- The SSH CA **root key**
- Chat **webhook URLs**

Anything that can safely be stored in Kubernetes Secrets should be moved there
as soon as possible.

> **⚠️ Important: If a secret is needed to recover Vault (e.g. unseal keys, root tokens), it must never be stored inside Vault itself.**

## Tooling: `sops` + `age`

We use [`sops`](https://github.com/getsops/sops) (Mozilla) and
[`age`](https://github.com/FiloSottile/age) (@FiloSottile) to store secrets in
Git **safely**.

The age private key was created with `age-keygen` and stored in a password
manager. The `.sops.yaml` file is configured to so that sops uses the age
encryption key.

## Usage

Don't ever store the age key on your computer. When you need to encrypt or
decrypt a secret, prepare the environment as follows:

1. Disable bash or zsh history to prevent the age key from being stored in the
   shell history. For bash: `set +o history`. For zsh: `unset HISTFILE`.
2. Set the `SOPS_AGE_KEY` environment variable to the value from the password
   manager:
    ```
    export SOPS_AGE_KEY=<value from password manager>
    ```

### Editing an encrypted YAML file

```
sops edit <file>.yaml
```

Keys are not encrypted in the YAML file, only the values.

### Editing an encrypted text file

If YAML doesn't fit your needs, you can use a text file:

```
sops edit <file>.txt
```

### Showing the content of an encrypted file

```
sops decrypt <file>
```

### Unset the `SOPS_AGE_KEY` environment variable

After you're done, unset the `SOPS_AGE_KEY` environment variable:

```
unset SOPS_AGE_KEY
```
