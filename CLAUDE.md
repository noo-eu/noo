# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the noo monorepo - a secure identity and mail platform. It consists of applications in `apps/`, shared packages in `packages/`, and supporting infrastructure code. Each subdirectory has its own CLAUDE.md file with specific guidance.

## Setup

Run `./setup.sh` to install dependencies. Requires PostgreSQL to be installed locally or accessible via `DATABASE_URL` environment variable.

## Monorepo Structure

- **apps/**: Main applications (id, mail) - each has dedicated CLAUDE.md
- **packages/**: Shared libraries (lib, oidc-server, ui) - each has dedicated CLAUDE.md
- **infra/**: Kubernetes, Terraform, and deployment infrastructure
- **tools/**: Development utilities (i18n-utils)

## Common Development Commands

- `pnpm` - Package manager (specified in package.json)
- `./setup.sh` - Initial project setup
- Code formatting handled by lint-staged with Prettier

## Development Guidelines

### Git Requirements
- All commits to main branch must be signed
- Use SSH signing key (instructions in README.md)

### Code Quality
- Prettier for formatting (configured via lint-staged)
- ESLint with React, TypeScript, and accessibility rules
- TypeScript strict mode

### Package Management
- Uses pnpm workspaces
- Packages reference each other with `workspace:*` protocol
- Install dependencies at appropriate workspace level

### Database
- PostgreSQL required for development
- Uses Drizzle ORM across applications
- Environment variable `TEST=1` for test database operations

## Security Principles

This platform prioritizes security with multiple defense layers:
- Multi-factor authentication (passkeys, TOTP)
- Password strength validation and breach checking
- Rate limiting and proof-of-work anti-brute-force
- Secure session management
- OIDC-compliant identity provider implementation

Refer to `apps/id/docs/security/` for detailed security documentation.