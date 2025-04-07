ARG NODE_VERSION=22.14.0

# Build stage
FROM node:${NODE_VERSION}-slim AS base

ARG PNPM_VERSION=10.7.1
ARG SENTRY_AUTH_TOKEN
ARG NONSECRET_SENTRY_DSN

ENV NODE_ENV=production

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack prepare pnpm@${PNPM_VERSION} --activate
RUN corepack enable
RUN pnpm config set inject-workspace-packages=true

FROM base AS build

# Copy the entire monorepo
WORKDIR /monorepo
COPY . .

# Create a standalone build of the single project, outside of the monorepo
RUN pnpm deploy --filter id /noo

WORKDIR /noo
RUN pnpm build

# Compile the main express server file
RUN pnpm tsc --noEmit false --noCheck --module nodenext \
  ./server.ts ./instrument.server.ts \
  ./drizzle.config.prod.ts ./app/db.server/schema.ts

# Clean up unnecessary dependencies
RUN pnpm prune --prod

# Final stage
FROM base AS production

WORKDIR /noo

ENV PORT=3000
RUN addgroup --system app && adduser --system app

COPY --from=build --chown=root:root --chmod=555 /noo/build ./build
COPY --from=build --chown=root:root --chmod=555 /noo/server.js /noo/instrument.server.js ./
COPY --from=build --chown=root:root --chmod=555 /noo/node_modules ./node_modules
COPY --from=build --chown=root:root --chmod=555 /noo/messages ./messages

COPY --from=build --chown=root:root --chmod=555 /noo/drizzle.config.prod.js ./drizzle.config.js
COPY --from=build --chown=root:root --chmod=555 /noo/app/db.server/schema.js ./app/db/schema.js
COPY --from=build --chown=root:root --chmod=555 /noo/drizzle ./drizzle

COPY --from=build --chown=root:root --chmod=555 /noo/docker-entrypoint.sh .

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "./server.js"]
