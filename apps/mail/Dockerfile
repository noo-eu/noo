ARG BUN_VERSION=1.2.8
ARG SENTRY_AUTH_TOKEN

FROM oven/bun:${BUN_VERSION} AS base

WORKDIR /noo
ENV NODE_ENV=production
ENV PORT=3000

# Build stage
FROM base AS build

RUN --mount=type=bind,target=/context \
  cd /context; \
  find . -name "package.json" -not -path "./node_modules/*" -maxdepth 4 -exec cp --parents "{}" /noo \;

COPY bun.lock bun.lock
RUN bun install --frozen-lockfile

COPY ui ./ui
COPY lib ./lib
COPY mail ./mail

WORKDIR /noo/mail

RUN bun run build

# Final stage
FROM base AS production

RUN addgroup --system app && adduser --system app

COPY --from=build --chown=root:root --chmod=555 /noo/mail /noo
COPY --from=build --chown=root:root --chmod=555 /noo/node_modules /noo/node_modules

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "./server.js"]
