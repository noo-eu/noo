ARG NODE_VERSION=22.14.0
ARG PNPM_VERSION=10.7.1
ARG SENTRY_AUTH_TOKEN

# Build stage
FROM node:${NODE_VERSION}-slim AS base

WORKDIR /noo
ENV NODE_ENV=production

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack prepare pnpm@${PNPM_VERSION} --activate
RUN corepack enable
RUN pnpm config set inject-workspace-packages=true

FROM base AS build

# Copy the entire monorepo
COPY . .

RUN pnpm deploy --filter id dist

WORKDIR /noo/dist
RUN pnpm build

# Compile the main express server file
RUN pnpm tsc --noEmit false --noCheck --module nodenext \
  ./server.ts ./instrument.server.ts \
  ./drizzle.config.prod.ts ./app/db.server/schema.ts

# Clean up unnecessary dependencies
RUN pnpm prune --prod

# Final stage
FROM base AS production

ENV PORT=3000
RUN addgroup --system app && adduser --system app

COPY --from=build --chown=root:root --chmod=555 /noo/dist/build ./build
COPY --from=build --chown=root:root --chmod=555 /noo/dist/server.js /noo/dist/instrument.server.js ./
COPY --from=build --chown=root:root --chmod=555 /noo/dist/node_modules ./node_modules
COPY --from=build --chown=root:root --chmod=555 /noo/dist/messages ./messages

COPY --from=build --chown=root:root --chmod=555 /noo/dist/drizzle.config.prod.js ./drizzle.config.js
COPY --from=build --chown=root:root --chmod=555 /noo/dist/app/db.server/schema.js ./app/db/schema.js
COPY --from=build --chown=root:root --chmod=555 /noo/dist/drizzle ./drizzle

COPY --from=build --chown=root:root --chmod=555 /noo/dist/docker-entrypoint.sh .

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "./server.js"]
