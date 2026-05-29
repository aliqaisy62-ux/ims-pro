FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ─── Development stage ───────────────────────────────────────────────────────
# Target this stage in docker-compose.dev.yml: `target: dev`
# Runs `next dev` with hot-reload; source is bind-mounted at runtime.
FROM base AS dev
COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json    ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/types/package.json ./packages/types/
RUN npm ci \
    --workspace=apps/web \
    --workspace=packages/ui \
    --workspace=packages/i18n \
    --workspace=packages/types \
    --include-workspace-root
COPY apps/web     ./apps/web
COPY packages/ui  ./packages/ui
COPY packages/i18n ./packages/i18n
COPY packages/types ./packages/types
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3001
# next dev must run from the app directory so it finds next.config.mjs
CMD ["sh", "-c", "cd apps/web && exec npx next dev -p 3001 -H 0.0.0.0"]

# ─── Production builder ───────────────────────────────────────────────────────
FROM base AS builder
COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/types/package.json ./packages/types/
RUN npm ci --workspace=apps/web --workspace=packages/ui --workspace=packages/i18n --workspace=packages/types --include-workspace-root
COPY apps/web ./apps/web
COPY packages/ui ./packages/ui
COPY packages/i18n ./packages/i18n
COPY packages/types ./packages/types
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT_STANDALONE=1
RUN npm run build --workspace=apps/web

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/web/server.js"]
