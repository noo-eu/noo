#!/bin/bash

set -e

if [ "${*}" == "node ./server.js" ]; then
  ./node_modules/.bin/drizzle-kit migrate
fi

exec "$@"
