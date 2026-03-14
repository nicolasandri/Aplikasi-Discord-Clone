#!/bin/bash
# Force fix Dockerfile

cd /opt/workgrid/app

echo "=== Checking current Dockerfile ==="
head -20 Dockerfile

echo ""
echo "=== Force rewrite Dockerfile ==="
cat > Dockerfile << 'DOCKERFILE'
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Create production build
ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}

RUN npm run build

# Stage 2: Production dengan Nginx
FROM nginx:alpine

RUN apk add --no-cache curl

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

RUN mkdir -p /var/cache/nginx/client_temp && \
    chmod 755 /var/cache/nginx/client_temp

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
DOCKERFILE

echo "=== Verify new Dockerfile ==="
head -20 Dockerfile

echo ""
echo "=== Clear ALL Docker cache ==="
docker system prune -af --volumes

echo ""
echo "=== Build frontend ==="
cd /opt/workgrid
docker compose -f docker-compose.prod.yml build --no-cache frontend

echo ""
echo "=== Start services ==="
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "=== Check status ==="
docker ps
