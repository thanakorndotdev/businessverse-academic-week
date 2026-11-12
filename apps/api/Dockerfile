FROM oven/bun:1-alpine AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN bun install --frozen-lockfile --production
FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=dependencies --chown=bun:bun /app/node_modules ./node_modules
COPY --chown=bun:bun apps/api ./apps/api
USER bun
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["sh", "entrypoint.sh"]
