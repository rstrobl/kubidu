# Multi-stage build for deploy controller
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspace packages
COPY packages/shared ./packages/shared
COPY packages/deploy-controller ./packages/deploy-controller

# Install dependencies
RUN npm install

# Build shared package first
WORKDIR /app/packages/shared
RUN npm run build

# Build deploy controller
WORKDIR /app/packages/deploy-controller
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy built artifacts and dependencies
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/deploy-controller/dist ./packages/deploy-controller/dist
COPY --from=builder /app/packages/deploy-controller/package.json ./packages/deploy-controller/
COPY --from=builder /app/packages/deploy-controller/prisma ./packages/deploy-controller/prisma

# Install production dependencies only
RUN npm install --production

# Generate Prisma client (stay at root level where node_modules is)
RUN npx prisma generate --schema=./packages/deploy-controller/prisma/schema.prisma

WORKDIR /app/packages/deploy-controller

CMD ["node", "dist/main.js"]
