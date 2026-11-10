# ==========================================
# BASE STAGE - Common dependencies and setup
# ==========================================
FROM node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS base

RUN apk add --no-cache --upgrade 'ca-certificates>=20261020-r0'
RUN ! grep -q MIICTjCCAdOgAwIBAgIKPPYHqWhwDtqLhDAKBggqhkjOPQQDAzBrMQswCQYDVQQG /etc/ssl/certs/ca-certificates.crt

# Set working directory and environment variables
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# ==========================================
# BUILD STAGE - Compile and prepare the app
# ==========================================
FROM base AS build

ARG VERSION=dev

# Set environment variables
ENV VERSION=${VERSION}

# Install dependencies first (better layer caching)
COPY --link package.json package-lock.json .npmrc ./
RUN npm ci --include=dev --ignore-scripts --no-audit --no-fund

# Copy application code
COPY --link . .

# Build application and clean up. The Sentry auth token (for source map upload)
# arrives as a BuildKit secret, so it never lands in image layers, history or
# provenance.
RUN --mount=type=secret,id=sentry_auth_token,env=SENTRY_AUTH_TOKEN \
    npm run build && \
    npm prune --omit=dev --ignore-scripts --no-audit --no-fund && \
    touch .env

# ==========================================
# PRODUCTION STAGE - Final lightweight image
# ==========================================
FROM base

# Accept VERSION as build argument and set as environment variable
ARG VERSION=dev
ENV VERSION=${VERSION}

# Use non-root user for better security
RUN addgroup -g 1001 datum && \
    adduser -u 1001 -G datum -D -H datum && \
    chown datum:datum /app

# Copy only necessary files from build stage
COPY --from=build --chown=datum:datum /app/build /app/build
COPY --from=build --chown=datum:datum /app/public /app/public
COPY --from=build --chown=datum:datum /app/package.json /app/package.json
COPY --from=build --chown=datum:datum /app/node_modules /app/node_modules
COPY --from=build --chown=datum:datum /app/.env /app/.env
COPY --from=build --chown=datum:datum /app/observability /app/observability

# Expose port
EXPOSE ${PORT}

USER datum

# Start the application
CMD ["node", "--env-file-if-exists=.env", "./observability/start.js"]
