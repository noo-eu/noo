ARG BUN_VERSION=1.2.3
ARG NODE_BUILDER_VERSION=22.14.0

FROM oven/bun:${BUN_VERSION} AS base

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps

COPY i18n-utils/package.json i18n-utils/package.json
COPY id/package.json id/package.json
COPY mail/package.json mail/package.json
COPY oidc-server/package.json oidc-server/package.json
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
COPY mail /app/mail

WORKDIR /app/mail

RUN npm run build -- --no-lint

FROM node:${NODE_BUILDER_VERSION} AS final

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system app && adduser --system app

COPY --from=deps --chown=root:root --chmod=555 /app/node_modules /app/node_modules
COPY --from=build --chown=root:root --chmod=555 /app/mail/.next/standalone .
COPY --from=build --chown=root:root --chmod=555 /app/mail/.next/static ./.next/static
COPY --from=build --chown=root:root --chmod=555 /app/mail/public ./public

COPY --from=build --chown=root:root --chmod=555 /app/mail/drizzle.config.prod.ts ./drizzle.config.ts
COPY --from=build --chown=root:root --chmod=555 /app/mail/src/db/schema.ts ./schema.ts
COPY --from=build --chown=root:root --chmod=555 /app/mail/drizzle ./drizzle
COPY --from=build --chown=root:root --chmod=555 /app/mail/docker-entrypoint.sh .

COPY --from=build --chown=root:root --chmod=555 /app/mail/src/messages ./src/messages

USER app

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT [ "./docker-entrypoint.sh" ]
CMD ["node", "./server.js"]
