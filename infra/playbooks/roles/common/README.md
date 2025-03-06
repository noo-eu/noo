# noo Ansible Role: common

An opinionated baseline configuration for Debian 12.

## Create an SSH Certificate Authority

```bash
ssh-keygen -t ed25519 -f ssh-ca -C "noo.eu SSH Certificate Authority"
```

Make sure to specify a passphrase for the CA key. Store the CA key, and the
passphrase in a secure location.

## TODO:

- [ ] `tlog` for session recording
- [ ] Consider setting Seal=true in journald.conf

## What happens here?

- [x] Ensures the timezone is UTC
- [x] Installs a SSH Certificate Authority file (trust is not configured)
- [x] Disables APT recommends and suggests and enables automatic security updates
- [x] Configures journald
- [x] Install core utilities: curl, gnupg, htop, ufw, vim, zsh and more
- [x] Creates a noo-admin group and user, to be used for further configuration. The
  user is allowed passwordless sudo access and uses zsh as the default shell.
- [x] Deletes /etc/machine-id for regeneration on next boot