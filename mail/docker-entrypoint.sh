#!/bin/bash

if [ "${*}" == "node ./server.js" ]; then
  npx drizzle-kit migrate
fi

exec "$@"
