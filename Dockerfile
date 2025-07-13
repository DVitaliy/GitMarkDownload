FROM node:lts-alpine as builder
WORKDIR /app

RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.pnpm-store pnpm fetch --frozen-lockfile
RUN --mount=type=cache,target=/root/.pnpm-store pnpm install
COPY . .
RUN pnpm run build

FROM node:lts-alpine as production
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules # For production dependencies

CMD ["node", "dist/index.js"]
