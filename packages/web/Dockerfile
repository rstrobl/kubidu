# Multi-stage build for web frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspace packages
COPY packages/shared ./packages/shared
COPY packages/web ./packages/web

# Install dependencies
RUN npm install

# Build shared package first
WORKDIR /app/packages/shared
RUN npm run build

# Build web package
WORKDIR /app/packages/web
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

# Copy nginx configuration
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
