# syntax=docker/dockerfile:1.7
#
# Glow Derma frontend: Next.js standalone server (storefront + admin BFF). Built by .github/workflows/ci.yml once
# per environment, because `next build` bakes the public origin into the bundle:
#   ghcr.io/glowdermatology/frontend:frontend-<sha7>-staging     (staging domain)
#   ghcr.io/glowdermatology/frontend:frontend-<sha7>-production  (production domain)
#
# Build-time values (variables of this repository's GitHub environments staging / production; changing one needs
# a rebuild):
#   NEXT_PUBLIC_SITE_URL, GLOWDERMA_ALLOWED_ORIGINS, GLOWDERMA_MEDIA_HOSTS, GLOWDERMA_MEDIA_ALLOW_LOCAL,
#   GLOWDERMA_BUILD_SHA. ALLOWED_ORIGINS and MEDIA_HOSTS are also read at runtime: the same values are baked into
#   the runtime environment below, so the two can never drift.
# Runtime values (infra repository): GLOWDERMA_DATA_SOURCE, GLOWDERMA_API_URL, GLOWDERMA_COOKIE_SECURE, the OAuth
#   ids, and the secrets file FRONTEND_SECRETS_FILE (Vault Agent) with GLOWDERMA_INTERNAL_SECRET and
#   GLOWDERMA_REVALIDATE_SECRET.

ARG NODE_IMAGE=node:24.22.2-trixie-slim@sha256:0820eaa85e07d0490446dd01d14707e17e6108a36988cf374899cd057eb3812d

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
ARG GLOWDERMA_MEDIA_ALLOW_LOCAL=
ARG GLOWDERMA_BUILD_SHA=
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    GLOWDERMA_ALLOWED_ORIGINS=${GLOWDERMA_ALLOWED_ORIGINS} \
    GLOWDERMA_MEDIA_HOSTS=${GLOWDERMA_MEDIA_HOSTS} \
    GLOWDERMA_MEDIA_ALLOW_LOCAL=${GLOWDERMA_MEDIA_ALLOW_LOCAL} \
    GLOWDERMA_BUILD_SHA=${GLOWDERMA_BUILD_SHA}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# A production image without its public origin or the Server Action origin allow-list would serve wrong
# canonical URLs and refuse every admin action.
RUN test -n "$NEXT_PUBLIC_SITE_URL" || { echo "NEXT_PUBLIC_SITE_URL build arg is required" >&2; exit 1; }; \
    test -n "$GLOWDERMA_ALLOWED_ORIGINS" || { echo "GLOWDERMA_ALLOWED_ORIGINS build arg is required" >&2; exit 1; }; \
    npm run build

# ============================================================
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ARG GLOWDERMA_BUILD_SHA=
ARG GLOWDERMA_ALLOWED_ORIGINS
ARG GLOWDERMA_MEDIA_HOSTS=
# HOSTNAME must be set: Docker sets it to the container id, and server.js binds to $HOSTNAME.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    GLOWDERMA_BUILD_SHA=${GLOWDERMA_BUILD_SHA} \
    GLOWDERMA_ALLOWED_ORIGINS=${GLOWDERMA_ALLOWED_ORIGINS} \
    GLOWDERMA_MEDIA_HOSTS=${GLOWDERMA_MEDIA_HOSTS}
# The standalone server traces only the files it needs; static assets and public/ go next to it. Everything is
# owned by root and read-only for the node user; .next/cache (written at runtime) is a tmpfs in production.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY docker/entrypoint.mjs ./entrypoint.mjs
# The server runs with plain `node`: npm, npx and corepack (and the dependencies npm bundles, which the image
# scanners flag) are dead weight at runtime, so they are removed.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
 && mkdir -p /app/.next/cache && chown node:node /app/.next/cache
USER 1000:1000
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "entrypoint.mjs"]
