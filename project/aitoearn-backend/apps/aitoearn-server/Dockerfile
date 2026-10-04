# syntax=docker/dockerfile:1.6
# Multi-distro support: BASE_IMAGE=alpine|debian|ubuntu (default: alpine)
ARG BASE_IMAGE=alpine

# ============ deps stage ============
FROM node:24-alpine AS deps-alpine
FROM node:24-bookworm-slim AS deps-debian
FROM node:24-jammy-slim AS deps-ubuntu

FROM deps-${BASE_IMAGE} AS deps

RUN if [ "$BASE_IMAGE" = "alpine" ]; then \
      npm install -g pnpm; \
    else \
      apt-get update && apt-get install -y --no-install-recommends \
        python3 build-essential ca-certificates openssl && \
      npm install -g pnpm && \
      rm -rf /var/lib/apt/lists/*; \
    fi

WORKDIR /app

# Mount pnpm store for cache between builds
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --version

COPY deps/ ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod

# ============ production stage ============
ARG BASE_IMAGE=alpine
FROM node:24-alpine AS prod-alpine
FROM node:24-bookworm-slim AS prod-debian
FROM node:24-jammy-slim AS prod-ubuntu

FROM prod-${BASE_IMAGE} AS production

ARG APP_NAME
ENV NODE_ENV=production
ENV APP_NAME=$APP_NAME

RUN if [ "$BASE_IMAGE" = "alpine" ]; then \
      apk add --no-cache curl ffmpeg vips vips-dev; \
    else \
      apt-get update && apt-get install -y --no-install-recommends \
        curl ffmpeg libvips-dev ca-certificates && \
      rm -rf /var/lib/apt/lists/*; \
    fi

RUN if [ "$BASE_IMAGE" = "alpine" ]; then \
      npm install -g pm2; \
    else \
      npm install -g pm2; \
    fi

WORKDIR /app

# Copy production assets
COPY --chown=node:node assets/ ./
COPY --from=deps --chown=node:node /app/ ./
COPY --chown=node:node apps/ ./apps/
COPY --chown=node:node libs/ ./libs/

# Switch to non-root user
USER node

CMD ["sh", "-c", "exec pm2-runtime start apps/${APP_NAME}/src/main.js --name ${APP_NAME} -- -c config.yaml"]
