# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm install --workspace=@kubidu/api --workspace=@kubidu/shared

# Copy source code
COPY packages/api ./packages/api
COPY packages/shared ./packages/shared
COPY tsconfig.base.json ./

# Build shared package first
WORKDIR /app/packages/shared
RUN npm run build

# Build API
WORKDIR /app/packages/api
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init and docker CLI for image inspection
RUN apk add --no-cache dumb-init docker-cli

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy package files
COPY package.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN npm install --workspace=@kubidu/api --workspace=@kubidu/shared --production

# Copy built artifacts
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy package.json to dist directory for bcrypt
COPY --from=builder /app/packages/api/package.json ./packages/api/dist/package.json

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Note: Commenting out USER nodejs to allow Docker socket access in development
# For production, implement proper Docker socket permissions or use a sidecar pattern
# USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "packages/api/dist/api/src/main.js"]
