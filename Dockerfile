# Multi-stage build. The image is built in CI and pushed to GHCR; the production host (Coolify)
# only pulls and runs it — no npm install / tsc ever runs on the box (invariant #7).

# --- builder: install all deps, compile TS -> dist ---
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# --- runtime: prod deps only, non-root ---
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Self-limit the V8 heap so the bot can't grow past its 512 MB cap on the RAM-tight, co-resident
# host (AGENTS.md invariant #7) — the runtime caps itself rather than waiting for an OOM-kill.
ENV NODE_OPTIONS=--max-old-space-size=384
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
# Internal liveness port (ADR-0014) — documented, not publicly routed.
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
