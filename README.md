# The noo monorepo

Welcome to [noo](https://noo.eu). This repository contains the source code for the noo ecosystem.

## Development

To get started, you can run `./setup.sh`. This will install all the required dependencies to work on a noo project.

### Expected environment

The `setup.sh` script expects PostgreSQL to be installed on your system. Dockerized PostgreSQL also works, but you will need to set the `DATABASE_URL` environment variable to point to the Docker container.

On Ubuntu, you can install it with:

```bash
sudo apt-get install postgresql
sudo -u postgres createuser -s $USER # Create a superuser role for your own user
```

On macOS, we recommend using [Postgres.app](https://postgresapp.com/).

## Signed commits

For security reasons all commits to the main branch must be signed. If you have not setup a signing key yet:

```
ssh-keygen -f ~/.ssh/git-sign -t ed25519
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/git-sign.pub
git config --global commit.gpgsign true
```

Then upload the ~/.ssh/git-sign.pub file to your Github keys, specifying it as a "Signing key".
