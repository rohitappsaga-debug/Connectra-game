FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN pnpm --filter shared build
RUN pnpm --filter server db:generate
RUN pnpm --filter server build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser
WORKDIR /app

# Copy built artifacts
COPY --from=builder --chown=appuser:nodejs /app/apps/server/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/apps/server/package.json ./
COPY --from=builder --chown=appuser:nodejs /app/apps/server/prisma ./prisma
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules

# Copy startup script
COPY --chown=appuser:nodejs apps/server/start.sh ./start.sh
RUN chmod +x ./start.sh

USER appuser
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["./start.sh"]
