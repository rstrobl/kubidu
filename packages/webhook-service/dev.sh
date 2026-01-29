#!/bin/sh

# Development startup script for webhook-service with Prisma hot reload

echo "🚀 Starting webhook-service in development mode..."

# Install dependencies
cd /app
npm install

# Build shared package
cd /app/packages/shared
npm run build

# Go to webhook-service
cd /app/packages/webhook-service

# Copy schema from API (source of truth) and generate Prisma client initially
echo "📋 Copying Prisma schema from API..."
cp /app/packages/api/prisma/schema.prisma prisma/schema.prisma
echo "📦 Generating Prisma client..."
npx prisma generate --schema=prisma/schema.prisma

# Start TypeScript compiler in watch mode
echo "🔧 Starting TypeScript compiler in watch mode..."
npx tsc --watch &
TSC_PID=$!

# Wait for initial compilation
sleep 15

# Create a background watcher for API schema.prisma changes
echo "👀 Watching for Prisma schema changes in API..."
(
  # Polling mechanism to watch for API schema changes
  API_SCHEMA="/app/packages/api/prisma/schema.prisma"
  LOCAL_SCHEMA="/app/packages/webhook-service/prisma/schema.prisma"
  SCHEMA_HASH=$(md5sum "$API_SCHEMA" 2>/dev/null | cut -d' ' -f1)

  while true; do
    sleep 3
    NEW_HASH=$(md5sum "$API_SCHEMA" 2>/dev/null | cut -d' ' -f1)
    if [ "$NEW_HASH" != "$SCHEMA_HASH" ] && [ -n "$NEW_HASH" ]; then
      SCHEMA_HASH=$NEW_HASH
      echo "📝 API Prisma schema changed, syncing and regenerating client..."
      cp "$API_SCHEMA" "$LOCAL_SCHEMA"
      npx prisma generate --schema="$LOCAL_SCHEMA"
      echo "✅ Prisma client regenerated"
    fi
  done
) &
WATCHER_PID=$!

# Start nodemon to watch compiled JS files
echo "🔥 Starting nodemon..."
npx nodemon --watch dist dist/webhook-service/src/main.js

# Cleanup on exit
trap "kill $TSC_PID $WATCHER_PID 2>/dev/null" EXIT
