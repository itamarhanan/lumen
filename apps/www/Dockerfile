# ============================================
# Stage 1: Dependencies Installation Stage
# ============================================
ARG NODE_VERSION=24-slim
FROM node:${NODE_VERSION} AS dependencies
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./

COPY apps/www/package.json ./apps/www/package.json

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    corepack enable pnpm && pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build
# ============================================
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable pnpm && pnpm --filter @lumen/www build

# ============================================
# Stage 3: Runner
# ============================================
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder --chown=node:node /app/apps/www/public ./apps/www/public

RUN mkdir -p apps/www/.next && chown -R node:node apps/www

COPY --from=builder --chown=node:node /app/apps/www/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/www/.next/static ./apps/www/.next/static

USER node
EXPOSE 3000
CMD ["node", "apps/www/server.js"]