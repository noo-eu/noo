# CLAUDE.md - @noo/lib Package

This file provides guidance to Claude Code (claude.ai/code) when working with the @noo/lib shared library package.

## Package Overview

This is the core shared library for the noo monorepo, providing common utilities used across applications and other packages.

## Development Commands

### Testing

- `pnpm test:unit` - Run unit tests with vitest (TEST=1)

## Package Structure

### Exports (package.json)

- `"."` → `./src/index.ts` - Main entry point
- `"./*"` → `./src/*.ts` - Direct file imports

### Key Modules

#### Human IDs (`./humanIds`)

Converts UUIDs to human-readable IDs with prefixes:

- `usr_` for users
- `sess_` for sessions
- `oidc_` for OIDC clients
- Functions: `uuidToHumanId()`, `humanIdToUuid()`, `hexToBase62()`

#### Internationalization (`./i18n`)

- `SUPPORTED_LANGUAGES` constant
- Language utilities for the platform

## Dependencies

### Runtime

- `accept-language-parser` - Language preference parsing

### Development

- Standard TypeScript/ESLint/Prettier tooling
- `vitest` for testing

## Usage in Other Packages

This package is referenced as `@noo/lib` in other workspace packages and imported like:

```typescript
import { humanIdToUuid, uuidToHumanId } from "@noo/lib/humanIds";
import { SUPPORTED_LANGUAGES } from "@noo/lib/i18n";
```

## Development Guidelines

### Adding New Utilities

1. Create new `.ts` file in `src/`
2. Export main functions/constants
3. Add unit tests alongside (`.spec.ts`)
4. Update main `src/index.ts` if needed for default exports

### Testing

- Unit tests should be comprehensive for utilities
- Test edge cases and error conditions
- Use descriptive test names

### API Design

- Keep APIs simple and focused
- Use TypeScript for type safety
- Consider backward compatibility when changing exports
