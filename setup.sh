#!/bin/bash

set -euo pipefail

echo "Welcome to the noo development setup script!"
echo "This script will install a small number of dependencies and set up your environment for development."

# check if asdf is installed
if ! command -v asdf &> /dev/null
then
    echo "asdf is not installed."
    if [ "$(uname)" == "Darwin" ]; then
        echo "Installing asdf via Homebrew..."
        if ! command -v brew &> /dev/null
        then
            echo "Homebrew is not installed. Please install Homebrew (https://brew.sh/) and run this script again."
            exit 1
        fi
        brew install asdf
    else
        echo "Please install asdf (https://asdf-vm.com/guide/getting-started.html) and run this script again."
        exit 1
    fi
fi

# check if postgres is installed
if ! command -v psql &> /dev/null
then
    echo "Postgres is not installed. Please check the recommended installation instructions for your operating system (https://github.com/noo-eu/noo#expected-environment)."
    exit 1
fi

echo "Installing asdf plugins..."
asdf plugin add pnpm
asdf plugin add nodejs

echo "Installing required runtime versions..."
asdf install

echo "Installing dependencies..."
pnpm install

echo "Installing pre-commit hooks..."
pnpm prepare
