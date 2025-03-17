#!/bin/bash

if [ "${*}" == "bun", "run", "./server.js" ]; then
  bun drizzle-kit migrate
fi

exec "$@"
