# syntax=docker/dockerfile:1.6
# Multi-distro support: BASE_IMAGE=alpine|debian|ubuntu (default: alpine)
ARG BASE_IMAGE=alpine

# ============ base stage ============
FROM node:24-alpine AS base-alpine
FROM node:24-bookworm-slim AS base-debian
FROM node:24-jammy-slim AS base-ubuntu

FROM base-${BASE_IMAGE} AS base

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV CI=true

# Native deps for Next.js build (sharp, etc.)
RUN if [ "$BASE_IMAGE" = "alpine" ]; then \
      apk add --no-cache libc6-compat; \
    else \
      apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates libc6-dev && \
      rm -rf /var/lib/apt/lists/*; \
    fi

# Enable corepack for pnpm
RUN if [ "$BASE_IMAGE" = "alpine" ]; then \
      corepack enable pnpm && corepack prepare pnpm@latest --activate; \
    else \
      apt-get update && apt-get install -y --no-install-recommends python3 build-essential && \
      corepack enable pnpm && corepack prepare pnpm@latest --activate && \
      rm -rf /var/lib/apt/lists/*; \
    fi

WORKDIR /app

# ============ deps stage ============
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# ============ builder stage ============
FROM deps AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ============ production stage ============
FROM base AS production

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN if [ "$BASE_IMAGE" = "alpine" ]; then \
      addgroup --system --gid 1001 nodejs && \
      adduser --system --uid 1001 nextjs; \
    else \
      groupadd --system --gid 1001 nodejs && \
      useradd --system --uid 1001 --gid nodejs nextjs; \
    fi

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
RUN mkdir .next && chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
