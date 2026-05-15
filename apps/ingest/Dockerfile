FROM node:22-alpine AS base
RUN npm i -g pnpm turbo

FROM base AS builder
WORKDIR /app
COPY . .
RUN turbo prune --scope=@lumen/ingest --docker

FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile

FROM installer AS runner
WORKDIR /app
COPY --from=builder /app/out/full/ .
RUN pnpm turbo build --filter=@lumen/ingest
CMD ["node", "apps/ingest/dist/main.js"]