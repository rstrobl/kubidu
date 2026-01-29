#!/bin/sh

# Development startup script for API with Prisma hot reload

echo "🚀 Starting API in development mode..."

# Go to API directory
cd /app/packages/api

# Install dependencies
npm install

# Go to shared package
cd /app/packages/shared

# Install and build shared package
npm install
npm run build

# Go back to API
cd /app/packages/api

# Generate Prisma client initially
echo "📦 Generating Prisma client..."
npx prisma generate

# Start TypeScript compiler in watch mode
echo "🔧 Starting TypeScript compiler in watch mode..."
npx tsc --watch &
TSC_PID=$!

# Wait for initial compilation
sleep 15

# Create a background watcher for schema.prisma changes
echo "👀 Watching for Prisma schema changes..."
(
  # Polling mechanism to watch for schema changes
  SCHEMA="/app/packages/api/prisma/schema.prisma"
  SCHEMA_HASH=$(md5sum "$SCHEMA" 2>/dev/null | cut -d' ' -f1)

  while true; do
    sleep 3
    NEW_HASH=$(md5sum "$SCHEMA" 2>/dev/null | cut -d' ' -f1)
    if [ "$NEW_HASH" != "$SCHEMA_HASH" ] && [ -n "$NEW_HASH" ]; then
      SCHEMA_HASH=$NEW_HASH
      echo "📝 Prisma schema changed, regenerating client..."
      npx prisma generate
      echo "✅ Prisma client regenerated"
    fi
  done
) &
WATCHER_PID=$!

# Start nodemon to watch compiled JS files
echo "🔥 Starting nodemon..."
npx nodemon --watch dist dist/api/src/main.js

# Cleanup on exit
trap "kill $TSC_PID $WATCHER_PID 2>/dev/null" EXIT
