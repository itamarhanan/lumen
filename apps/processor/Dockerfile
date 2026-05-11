# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:24-slim AS dependencies
WORKDIR /app

COPY package.json pnpm-lock.yaml* .npmrc* ./
COPY apps/processor/package.json ./apps/processor/package.json

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    corepack enable pnpm && pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build
# ============================================
FROM node:24-slim AS builder
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN corepack enable pnpm && pnpm --filter @lumen/processor build

# ============================================
# Stage 3: Deploy (flatten deps)
# ============================================
FROM node:24-slim AS deploy
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
COPY --from=builder /app/apps/processor/dist ./apps/processor/dist

RUN corepack enable pnpm && pnpm --filter @lumen/processor deploy --prod /app/deployed

# ============================================
# Stage 4: Runner
# ============================================
FROM node:24-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deploy /app/deployed/node_modules ./node_modules
COPY --from=builder /app/apps/processor/dist ./dist
COPY --from=builder /app/apps/processor/package.json ./package.json

CMD ["node", "dist/index.js"]