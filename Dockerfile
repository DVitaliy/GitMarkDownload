FROM node:lts-alpine AS deps
WORKDIR /app

RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.pnpm-store pnpm install --frozen-lockfile --prod

FROM node:lts-alpine AS builder
WORKDIR /app

RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.pnpm-store pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:lts-alpine AS production
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules

CMD ["node", "dist/index.js"]
