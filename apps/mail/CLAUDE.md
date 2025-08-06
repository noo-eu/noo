# CLAUDE.md - noo Mail Application

This file provides guidance to Claude Code (claude.ai/code) when working with the noo mail application.

## Application Overview

This is the noo mail application - a web-based email client that integrates with the noo identity system. Built with React Router v7, Express.js, and designed to work with the noo ID application for authentication.

## Development Commands

### Build and Development

- `pnpm build` - Build for production with React Router
- `pnpm dev` - Start development server with tsx hot reload
- `pnpm start` - Start production server
- `pnpm typecheck` - Run TypeScript checks (includes React Router typegen)

### Testing

- `pnpm test:unit` - Run unit tests with vitest (TEST=1)
- `pnpm test:unit:watch` - Run unit tests in watch mode
- `pnpm test:e2e` - Run Playwright end-to-end tests
- `pnpm test:e2e:ui` - Run Playwright tests with UI

### Database Operations

- `pnpm db:generate` - Generate migrations with drizzle-kit
- `pnpm db:migrate` - Run migrations
- `pnpm db:studio` - Open Drizzle Studio
- `pnpm db:test:push` - Push schema to test DB (TEST=1)
- `pnpm db:test:fixtures` - Load test data (TEST=1)

## Architecture

### Tech Stack

- **Frontend**: React 19, React Router v7, TailwindCSS v4
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Integrates with noo ID application

### Directory Structure

- `app/` - Main application code
  - `db/` - Database models and operations
  - `lib/` - Utilities (session, user profile, CSP)
  - `routes/` - React Router route handlers
  - `root.tsx` - Root application component
  - `routes.ts` - Route definitions

### Database Schema

Defined in `app/db/schema.ts`:

- `sessions` - User session management
- Basic schema for mail application functionality

### Routes Structure (app/routes.ts)

- `/_index.tsx` - Home/inbox view
- `/$userIdx.tsx` - User-specific mail views
- `/auth/start.ts` - Authentication initiation
- `/auth/callback.ts` - Authentication callback

## Key Dependencies

### Workspace Packages

- `@noo/lib` - Shared utilities from noo monorepo

### External Libraries

- `accept-language-parser` - Language detection
- `drizzle-orm` - Database ORM
- `use-intl` - Internationalization

## Development Guidelines

### Database Changes

1. Modify schema in `app/db/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Apply with `pnpm db:migrate`
4. For tests, use `pnpm db:test:push`

### Authentication Integration

- Uses authentication callbacks to integrate with noo ID
- Session management in `app/lib/session.ts`
- User profile handling in `app/lib/userProfile.ts`

### Testing

- Unit tests alongside source files
- E2E tests in `tests/` directory
- Test fixtures in `tests/fixtures.ts`

### Internationalization

- Messages in `messages/` directory organized by feature
- Supports multiple languages (same structure as noo ID)

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection
- `TEST=1` - Test mode flag
- Authentication-related variables for ID integration
