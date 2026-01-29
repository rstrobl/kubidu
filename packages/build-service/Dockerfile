# Multi-stage build for build service
FROM node:20-alpine AS builder

WORKDIR /app

# Install git (needed for simple-git)
RUN apk add --no-cache git

# Copy root package files
COPY package*.json ./

# Copy workspace packages
COPY packages/shared ./packages/shared
COPY packages/build-service ./packages/build-service

# Install dependencies
RUN npm install

# Build shared package first
WORKDIR /app/packages/shared
RUN npm run build

# Build build service
WORKDIR /app/packages/build-service
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install git and docker CLI (for docker operations)
RUN apk add --no-cache git docker-cli

# Copy root package files
COPY package*.json ./

# Copy built artifacts and dependencies
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/build-service/dist ./packages/build-service/dist
COPY --from=builder /app/packages/build-service/package.json ./packages/build-service/
COPY --from=builder /app/packages/build-service/prisma ./packages/build-service/prisma

# Install production dependencies only
RUN npm install --production

# Generate Prisma client (stay at root level where node_modules is)
RUN npx prisma generate --schema=./packages/build-service/prisma/schema.prisma

# Create directory for build cache
RUN mkdir -p /build-cache

WORKDIR /app/packages/build-service

CMD ["node", "dist/build-service/src/main.js"]
