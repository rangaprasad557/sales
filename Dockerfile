# ==============================================================================
# Multi-Stage Production Dockerfile for Google Cloud Run Deployment
# Services: Next.js 14 Frontend + Python Multi-Batch Sales & Inventory Backend
# ==============================================================================

# Stage 1: Build Next.js Production Assets
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies cleanly
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy frontend source code and build standalone production bundle
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Production Container Runtime (Python 3.11 + Node.js 20)
FROM python:3.11-slim AS runner

WORKDIR /app

# Install Node.js 20 runtime and system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    sqlite3 \
    ca-certificates \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Runtime Environment Variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV BACKEND_PORT=8000
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Copy Python Backend & Store Data
COPY server.py db.py ./
COPY data ./data

# Copy Next.js Standalone Build & Static Assets
COPY --from=frontend-builder /app/frontend/.next/standalone ./
COPY --from=frontend-builder /app/frontend/.next/static ./.next/static
COPY --from=frontend-builder /app/frontend/public ./public

# Copy Entrypoint Startup Script
COPY entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

# Cloud Run listens on port 8080
EXPOSE 8080

CMD ["./entrypoint.sh"]
