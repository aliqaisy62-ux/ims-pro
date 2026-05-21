FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

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
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
EXPOSE 4001
CMD ["node", "dist/index.js"]
