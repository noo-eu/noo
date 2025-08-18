# CLAUDE.md - @noo/ui Package

This file provides guidance to Claude Code (claude.ai/code) when working with the @noo/ui shared UI components package.

## Package Overview

This package provides reusable React components and UI utilities for the noo platform, built with TailwindCSS and designed for consistency across applications.

## Development Commands

### Storybook

- `pnpm storybook` - Run Storybook development server on port 6006
- `pnpm build-storybook` - Build static Storybook

## Package Structure

### Exports (package.json)

- `"."` → `./src/index.tsx` - Main entry point
- `"./*"` → `./src/*.tsx` - Direct component imports

### Dependencies

- `@heroicons/react` - Icon library
- `react` and `react-dom` (peer dependencies >19.0.0)

### Development Tools

- **Storybook**: Component development and documentation
  - Addon essentials, themes, testing support
  - Chromatic integration for visual testing
- **TailwindCSS v4**: Styling system
- **Vitest**: Unit testing with browser support
- **Playwright**: End-to-end testing for components

## Development Guidelines

### Component Development

1. Create components in `src/` directory
2. Export from main `src/index.tsx` if widely used
3. Write Storybook stories for each component
4. Use TypeScript for all components
5. Follow TailwindCSS design patterns

### Storybook Usage

- Stories should cover main use cases
- Include accessibility testing with addon-a11y
- Document component APIs and props
- Use addon-themes for light/dark mode testing

### Styling Guidelines

- Use TailwindCSS v4 classes
- Maintain design system consistency
- Support both light and dark themes
- Ensure responsive design

### Testing Strategy

- **Unit tests**: Component logic and rendering
- **Visual tests**: Storybook + Chromatic for regression
- **Browser tests**: Playwright for interaction testing

### Icon Usage

Use Heroicons consistently:

```typescript
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/20/solid";
```

### TypeScript

- Define clear prop interfaces
- Use generic types where appropriate
- Export types for component consumers

### Performance

- Consider React.memo for expensive components
- Use appropriate bundling strategies
- Optimize for tree-shaking

## Integration with Applications

Components are imported by applications like:

```typescript
import { Button, Modal } from "@noo/ui";
// or
import { Button } from "@noo/ui/Button";
```

Design system should be consistent across all noo applications while allowing for application-specific customizations.
