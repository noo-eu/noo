ARG BUN_VERSION=1.2.8
ARG NODE_BUILDER_VERSION=22.14.0

FROM oven/bun:${BUN_VERSION} AS base

WORKDIR /noo
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps

RUN --mount=type=bind,target=/context \
  cd /context; \
  find . -name "package.json" -not -path "./node_modules/*" -maxdepth 4 -exec cp --parents "{}" /noo \;
COPY bun.lock bun.lock

RUN bun install --frozen-lockfile

# Note: there seem to be a bug between bun and nextjs.
# Builds are happening on Node, for now.
FROM node:${NODE_BUILDER_VERSION} AS build

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgres:///build

COPY --from=deps /noo/node_modules /noo/node_modules

COPY packages/ui /noo/packages/ui
COPY packages/lib /noo/packages/lib
COPY packages/oidc-server /noo/packages/oidc-server
COPY apps/id /noo/apps/id

WORKDIR /noo/apps/id

# dummy value for build
ENV PAIRWISE_SALT=1

RUN npm run build -- --no-lint

FROM node:${NODE_BUILDER_VERSION} AS final

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system app && adduser --system app

COPY --from=deps --chown=root:root --chmod=555 /noo/node_modules /noo/node_modules
COPY --from=build --chown=root:root --chmod=555 /noo/apps/id/.next/standalone .
COPY --from=build --chown=root:root --chmod=555 /noo/apps/id/.next/static ./.next/static
COPY --from=build --chown=root:root --chmod=555 /noo/apps/id/public ./public

COPY --from=build --chown=root:root --chmod=555 /noo/apps/id/drizzle.config.prod.ts ./drizzle.config.ts
COPY --from=build --chown=root:root --chmod=555 /noo/apps/id/src/db/schema.ts ./schema.ts
COPY --from=build --chown=root:root --chmod=555 /noo/apps/id/drizzle ./drizzle
COPY --from=build --chown=root:root --chmod=555 /noo/apps/id/docker-entrypoint.sh .

COPY --from=build --chown=root:root --chmod=555 /noo/apps/id/src/messages ./src/messages

USER app

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT [ "./docker-entrypoint.sh" ]
CMD ["node", "./server.js"]
