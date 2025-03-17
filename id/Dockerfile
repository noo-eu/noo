ARG BUN_VERSION=1.2.3
ARG NODE_BUILDER_VERSION=22.14.0

FROM oven/bun:${BUN_VERSION} AS base

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps

COPY id/package.json id/package.json
COPY mail/package.json mail/package.json
COPY ui/package.json ui/package.json
COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

# Note: there seem to be a bug between bun and nextjs.
# Builds are happening on Node, for now.
FROM node:${NODE_BUILDER_VERSION} AS build

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgres:///build

COPY --from=deps /app/node_modules /app/node_modules

COPY ui /app/ui
COPY id /app/id

WORKDIR /app/id

RUN npm run build -- --no-lint

FROM base AS final

RUN addgroup --system app
RUN adduser --system app

COPY --from=deps --chown=app:app /app/node_modules /app/node_modules
COPY --from=build --chown=app:app /app/id/.next/standalone .
COPY --from=build --chown=app:app /app/id/.next/static ./.next/static
COPY --from=build --chown=app:app /app/id/public ./public

USER app

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["bun", "run", "./server.js"]
