# CLAUDE.md - noo ID Application

This file provides guidance to Claude Code (claude.ai/code) when working with the noo identity provider application.

## Application Overview

This is the noo identity provider - a secure OIDC-compliant authentication server built with React Router v7, Express.js, and Drizzle ORM. It provides user authentication, multi-factor auth, and acts as an OpenID Connect identity provider.

## Development Commands

### Build and Development

- `pnpm build` - Build for production with React Router
- `pnpm dev` - Start development server with tsx hot reload
- `pnpm start` - Start production server
- `pnpm typecheck` - Run TypeScript checks (includes React Router typegen)

### Testing

- `pnpm test:unit` - Run unit tests with vitest (UNIT=1 TEST=1)
- `pnpm test:unit:watch` - Run unit tests in watch mode
- `pnpm test:e2e` - Run Playwright end-to-end tests
- `pnpm test:e2e:ui` - Run Playwright tests with UI

### Database Operations

- `pnpm db:generate` - Generate migrations with drizzle-kit
- `pnpm db:migrate` - Run migrations
- `pnpm db:studio` - Open Drizzle Studio
- `pnpm db:test:push` - Push schema to test DB (TEST=1)
- `pnpm db:test:fixtures` - Load test data (TEST=1)

### Key Management

- `pnpm keys:rotate` - Rotate JWKS signing keys

## Architecture

### Tech Stack

- **Frontend**: React 19, React Router v7, TailwindCSS v4
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Argon2, passkeys (WebAuthn), TOTP, JWKS

### Directory Structure

- `app/` - Main application code
  - `auth.server/` - Authentication logic and session management
  - `db.server/` - Database models and operations
  - `lib.server/` - Server-side utilities (OIDC, JWKS, validation)
  - `lib/` - Client-server shared utilities
  - `routes/` - React Router route handlers
  - `screens/` - Complex UI components
  - `components/` - Reusable UI components
  - `types/` - TypeScript type definitions

### Database Schema

Core tables defined in `app/db.server/schema.ts`:

- `users` - User accounts with profile data
- `sessions` - Authentication sessions
- `passkeys` - WebAuthn credentials
- `oidcClients` - OIDC client registrations
- `oidcAuthorizationCodes` - Authorization codes
- `oidcAccessTokens` - Access tokens
- `oidcConsents` - User consents

Uses human-readable IDs (via `@noo/lib/humanIds`) converted to UUIDs internally.

### Routes Structure (app/routes.ts)

- Signup flow: `/signup` → `/signup/username` → `/signup/password` → `/signup/terms`
- Authentication: `/signin`, `/signin/otp`
- User areas: `/profile/*`, `/settings/*`, `/security/*`
- OIDC endpoints: `/oidc/authorize`, `/oidc/token`, `/oidc/userinfo`, etc.
- Private APIs: `/private/webauthn/*`, `/private/passwords/*`

### Security Features

- **Anti-brute force**: Proof-of-Work challenges (app/lib/pow/server.ts)
- **Rate limiting**: TOTP form protection with exponential backoff
- **Password security**: zxcvbn strength validation, HaveIBeenPwned checking
- **MFA**: Passkeys (WebAuthn) and TOTP support
- **Session security**: Advisory locks, secure cookie handling

## Key Dependencies

### Workspace Packages

- `@noo/lib` - Shared utilities (human IDs, i18n)
- `@noo/oidc-server` - OIDC server implementation
- `@noo/ui` - Shared UI components

### External Libraries

- `@simplewebauthn/*` - WebAuthn/passkey implementation
- `argon2` - Password hashing
- `jose` - JWT/JWKS handling
- `zxcvbn-ts` - Password strength validation
- `drizzle-orm` - Database ORM

## Development Guidelines

### Database Changes

1. Modify schema in `app/db.server/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Apply with `pnpm db:migrate`
4. For tests, use `pnpm db:test:push`

### Authentication Flow

- Session management in `app/auth.server/sessions/`
- OIDC server configuration in `app/lib.server/oidcServer.ts`
- User claims processing in `app/lib.server/userClaims.ts`

### Testing

- Unit tests alongside source files (`.spec.ts`)
- E2E tests in `tests/` directory
- Page objects in `tests/pages/`
- Test fixtures in `tests/fixtures/`

### Security Considerations

- Follow patterns in existing auth routes
- Always validate user input with Zod schemas
- Use `@noo/lib/humanIds` for external ID representation
- Implement proper OIDC flows as per `@noo/oidc-server`
- Review `docs/security/account-protection.md` for anti-abuse measures

### Environment Variables

Key variables (see existing routes for usage):

- `OIDC_ISSUER` - Base URL for OIDC endpoints
- `PAIRWISE_SALT` - For OIDC pairwise subject identifiers
- `DATABASE_URL` - PostgreSQL connection
- `TEST=1` - Test mode flag
