#!/bin/sh
set -eu

npx prisma migrate deploy
npm run init:admin
exec npm run start
