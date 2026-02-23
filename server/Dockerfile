# ============================================
# Discord Clone Backend - Dockerfile
# Multi-stage build untuk production
# Optimized untuk 110 concurrent users
# ============================================

# Stage 1: Dependencies
FROM node:18-alpine AS dependencies

WORKDIR /app

# Install dependencies untuk native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Production
FROM node:18-alpine AS production

WORKDIR /app

# Install PostgreSQL client untuk healthcheck
RUN apk add --no-cache postgresql-client curl

# Create non-root user untuk security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependencies dari stage 1
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create uploads directory dengan proper permissions
RUN mkdir -p uploads && chmod 777 uploads

# Switch ke non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start command
CMD ["node", "server.js"]
