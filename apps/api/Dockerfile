FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

FROM base AS builder
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
RUN npm ci --workspace=apps/api --workspace=packages/db --workspace=packages/types --include-workspace-root
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/types ./packages/types
RUN npm run db:generate
WORKDIR /app/apps/api
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nodeapp
COPY --from=builder --chown=nodeapp:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nodeapp:nodejs /app/apps/api/package.json ./
COPY --from=builder --chown=nodeapp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeapp:nodejs /app/packages ./packages
COPY --chown=nodeapp:nodejs apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh && \
    mkdir -p uploads && chown nodeapp:nodejs uploads
USER nodeapp
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:4000/health || exit 1
CMD ["sh", "entrypoint.sh"]
