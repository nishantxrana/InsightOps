# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install ALL dependencies (need devDependencies for build)
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend
ARG VITE_CLARITY_PROJECT_ID
ARG VITE_DEMO_VIDEO_URL
ENV VITE_CLARITY_PROJECT_ID=$VITE_CLARITY_PROJECT_ID
ENV VITE_DEMO_VIDEO_URL=$VITE_DEMO_VIDEO_URL
RUN npm run build

# ============================================
# Stage 2: Setup Backend (NO Chromium here)
# ============================================
FROM node:22-slim AS backend-setup

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies (production only)
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./

# Copy frontend build from previous stage
COPY --from=frontend-builder /app/frontend/dist ./public

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM node:22-slim

# Install only runtime dependencies for Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy application from backend-setup stage
COPY --from=backend-setup --chown=appuser:appuser /app ./

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown -R appuser:appuser /app/logs

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_DEVEL_SANDBOX=/usr/lib/chromium/chrome-sandbox \
    XDG_CONFIG_HOME=/tmp/.chromium \
    XDG_CACHE_HOME=/tmp/.chromium-cache

# Create temp directories for Chromium
RUN mkdir -p /tmp/.chromium /tmp/.chromium-cache \
    && chown -R appuser:appuser /tmp/.chromium /tmp/.chromium-cache

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3001

# Health check with timeout
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "const req=require('http').get('http://localhost:3001/api/health',res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));req.setTimeout(5000,()=>{req.destroy();process.exit(1);});"

# Start application
CMD ["node", "main.js"]
