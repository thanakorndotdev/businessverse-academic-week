#!/bin/sh
set -eu
bun src/db/migrate.ts
bun src/db/seed.ts
exec bun src/index.ts
