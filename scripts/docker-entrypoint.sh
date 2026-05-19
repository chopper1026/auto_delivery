#!/bin/sh
set -eu

./node_modules/.bin/prisma migrate deploy
node scripts/init-admin-runtime.mjs
exec node server.js
