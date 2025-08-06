# CLAUDE.md - @noo/oidc-server Package

This file provides guidance to Claude Code (claude.ai/code) when working with the @noo/oidc-server package.

## Package Overview

This package implements a complete OpenID Connect (OIDC) server compliant with the OIDC specification. It provides the core authentication and authorization logic used by the noo ID application.

## Development Commands

### Testing

- `pnpm test:unit` - Run unit tests with vitest (TEST=1)
- `pnpm test:unit:watch` - Run unit tests in watch mode

## Package Structure

### Exports (package.json)

- `"./*"` → `./src/*.ts` - Direct file imports for all modules

### Key Modules

#### Configuration (`./configuration`)

- `configureIdP()` - Main IdP configuration function
- Client and authorization code type definitions
- Integration points for database and crypto operations

#### Authorization (`./authorization/`)

- `performOidcAuthorization()` - Handle authorization requests
- `buildAuthorizationResponse()` - Build authorization responses
- `returnToClient()` - Complete authorization flow

#### Token Handling (`./token/`)

- `handleTokenRequest()` - Process token endpoint requests
- JWT creation and validation

#### Discovery (`./discovery`)

- `discoveryMetadata()` - OIDC discovery endpoint data

#### UserInfo (`./userinfo`)

- `handleUserinfo()` - UserInfo endpoint implementation

## Dependencies

### Runtime

- `jose` - JWT/JWKS operations
- `neverthrow` - Functional error handling
- `zod` - Runtime type validation

### Development

- Standard TypeScript/ESLint/Prettier tooling
- `vitest` for testing

## Usage Pattern

This package is designed to be configured once and then used throughout the application:

```typescript
import { configureIdP } from "@noo/oidc-server/configuration";

configureIdP({
  baseUrl: process.env.OIDC_ISSUER,
  supportedLocales: SUPPORTED_LANGUAGES,
  getClient: async (clientId) => {
    /* ... */
  },
  getJwk: async (kid) => {
    /* ... */
  },
  // ... other config
});
```

## Development Guidelines

### OIDC Compliance

- Follow OpenID Connect specifications strictly
- Test against OIDC test suites when possible
- Document any deviations from spec

### Error Handling

- Use `neverthrow` Result types for error handling
- Provide clear error messages for debugging
- Handle edge cases in authorization flows

### Security Considerations

- Validate all inputs with Zod schemas
- Implement proper PKCE flow
- Handle token lifetimes correctly
- Secure JWT signing and verification

### Testing

- Unit tests for all OIDC flows
- Test error conditions and edge cases
- Mock external dependencies properly

### Integration Points

The package expects the consuming application to provide:

- Database operations (clients, codes, tokens)
- Cryptographic operations (JWT signing)
- User authentication and claims
- Session management
