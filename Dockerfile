# syntax=docker/dockerfile:1.7
#
# Glow Derma frontend: Next.js standalone server (landing + admin BFF).
#
# Build-time values (baked into the bundle by `next build`; changing one needs
# a rebuild): NEXT_PUBLIC_SITE_URL, GLOWDERMA_ALLOWED_ORIGINS,
# GLOWDERMA_MEDIA_HOSTS, GLOWDERMA_BUILD_SHA.
# Runtime values (container environment): GLOWDERMA_DATA_SOURCE,
# GLOWDERMA_API_URL, GLOWDERMA_INTERNAL_SECRET, GLOWDERMA_COOKIE_SECURE and
# GLOWDERMA_ALLOWED_ORIGINS again (the auth route handlers read it per request).

ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SITE_URL
ARG GLOWDERMA_ALLOWED_ORIGINS
ARG GLOWDERMA_MEDIA_HOSTS=
ARG GLOWDERMA_BUILD_SHA=
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    GLOWDERMA_ALLOWED_ORIGINS=${GLOWDERMA_ALLOWED_ORIGINS} \
    GLOWDERMA_MEDIA_HOSTS=${GLOWDERMA_MEDIA_HOSTS} \
    GLOWDERMA_BUILD_SHA=${GLOWDERMA_BUILD_SHA}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# A production image without its public origin or the Server Action origin
# allow-list would serve wrong canonical URLs and refuse every admin action.
RUN test -n "$NEXT_PUBLIC_SITE_URL" || { echo "NEXT_PUBLIC_SITE_URL build arg is required" >&2; exit 1; }; \
    test -n "$GLOWDERMA_ALLOWED_ORIGINS" || { echo "GLOWDERMA_ALLOWED_ORIGINS build arg is required" >&2; exit 1; }; \
    npm run build

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
ARG GLOWDERMA_BUILD_SHA=
ENV GLOWDERMA_BUILD_SHA=${GLOWDERMA_BUILD_SHA}
LABEL org.opencontainers.image.title="glowderma-frontend" \
      org.opencontainers.image.revision="${GLOWDERMA_BUILD_SHA}"
# The standalone server traces only the files it needs; static assets and
# public/ are copied next to it as Next expects.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "server.js"]
