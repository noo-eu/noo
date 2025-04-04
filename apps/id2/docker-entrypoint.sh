#!/bin/bash

if [ "${*}" == "bun ./server.js" ]; then
  bun run drizzle-kit migrate
fi

exec "$@"

