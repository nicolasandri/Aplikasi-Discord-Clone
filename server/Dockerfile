# ============================================
# Discord Clone Backend - Dockerfile
# Multi-stage build untuk production
# Optimized untuk 110 concurrent users
# ============================================

# Stage 1: Dependencies
FROM node:20-alpine AS dependencies

WORKDIR /app

# Install dependencies untuk native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
# Clean install - remove old lock file if exists
RUN rm -f package-lock.json && \
    npm install --production && \
    npm cache clean --force

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install PostgreSQL client untuk healthcheck
RUN apk add --no-cache postgresql-client curl

# Copy dependencies dari stage 1
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create uploads directory dengan proper permissions
RUN mkdir -p uploads && chmod 777 uploads

# Expose port
EXPOSE 3001

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start command
CMD ["node", "server.js"]
