# Multi-stage build for webhook service
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspace packages
COPY packages/shared ./packages/shared
COPY packages/webhook-service ./packages/webhook-service

# Install dependencies
RUN npm install

# Build shared package first
WORKDIR /app/packages/shared
RUN npm run build

# Build webhook service
WORKDIR /app/packages/webhook-service
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy built artifacts and dependencies
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/webhook-service/dist ./packages/webhook-service/dist
COPY --from=builder /app/packages/webhook-service/package.json ./packages/webhook-service/
COPY --from=builder /app/packages/webhook-service/prisma ./packages/webhook-service/prisma

# Install production dependencies only
RUN npm install --production

# Generate Prisma client (stay at root level where node_modules is)
RUN npx prisma generate --schema=./packages/webhook-service/prisma/schema.prisma

WORKDIR /app/packages/webhook-service

EXPOSE 3001

CMD ["node", "dist/webhook-service/src/main.js"]
