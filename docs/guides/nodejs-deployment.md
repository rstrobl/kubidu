# Deploy a Node.js App

A complete guide to deploying Node.js applications on Kubidu.

## Overview

Kubidu has first-class support for Node.js applications. This guide covers:
- Express, Fastify, NestJS, and other frameworks
- Automatic detection and configuration
- Production best practices

## Prerequisites

- [Kubidu CLI installed](../getting-started/installation.md)
- Node.js 18+ locally
- A Kubidu account

## Quick Deploy

For a typical Node.js app with a `package.json`:

```bash
cd my-node-app
kubidu init
kubidu deploy
```

That's it! Kubidu auto-detects Node.js and configures everything.

## Step-by-Step Guide

### Step 1: Prepare Your App

Ensure your `package.json` has:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

**Important Requirements:**
- ✅ A `start` script in `package.json`
- ✅ Listen on `process.env.PORT`
- ✅ All dependencies in `package.json` (not just devDependencies)

### Step 2: Configure Your Server

Your app must listen on the PORT environment variable:

```javascript
// index.js
const express = require('express');
const app = express();

// Use PORT from environment (Kubidu sets this)
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Kubidu!' });
});

// Health check endpoint (recommended)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 3: Add Health Check

Create a health endpoint for zero-downtime deployments:

```javascript
app.get('/health', (req, res) => {
  // Add your health logic here
  const healthy = checkDatabaseConnection() && checkRedisConnection();
  
  if (healthy) {
    res.status(200).json({ status: 'healthy' });
  } else {
    res.status(503).json({ status: 'unhealthy' });
  }
});
```

### Step 4: Initialize Kubidu

```bash
kubidu init
```

This creates `kubidu.yaml`:

```yaml
name: my-node-app
service: web

deploy:
  port: 3000
  healthcheck: /health
```

### Step 5: Set Environment Variables

```bash
# Regular variables
kubidu env set NODE_ENV=production

# Secrets (encrypted)
kubidu env set DATABASE_URL=postgres://... --secret
kubidu env set API_KEY=sk-... --secret
```

### Step 6: Deploy

```bash
kubidu deploy
```

Watch the deployment:

```
⠋ Uploading source code...
⠋ Detecting Node.js 20.x...
⠋ Installing dependencies...
⠋ Building application...
⠋ Deploying container...
✔ Deployed successfully in 45s

  URL: https://my-node-app-abc123.kubidu.app
```

## Framework-Specific Guides

### Express

```javascript
// Standard Express setup
const express = require('express');
const app = express();

// Trust proxy (Kubidu runs behind load balancer)
app.set('trust proxy', 1);

// Parse JSON
app.use(express.json());

// Your routes...
app.get('/', (req, res) => res.json({ ok: true }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(process.env.PORT || 3000);
```

### Fastify

```javascript
const fastify = require('fastify')({ logger: true });

fastify.get('/', async () => ({ hello: 'world' }));

fastify.get('/health', async () => ({ status: 'ok' }));

// Listen on 0.0.0.0 for container
fastify.listen({ 
  port: process.env.PORT || 3000,
  host: '0.0.0.0'
});
```

### NestJS

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS if needed
  app.enableCors();
  
  // Use PORT env var
  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();
```

Update `package.json`:

```json
{
  "scripts": {
    "build": "nest build",
    "start": "node dist/main.js",
    "start:prod": "node dist/main.js"
  }
}
```

### Next.js

For Next.js apps, use standalone output:

```javascript
// next.config.js
module.exports = {
  output: 'standalone',
};
```

```json
// package.json
{
  "scripts": {
    "build": "next build",
    "start": "node .next/standalone/server.js"
  }
}
```

### Remix

```json
// package.json
{
  "scripts": {
    "build": "remix build",
    "start": "remix-serve build"
  }
}
```

## Custom Dockerfile

For complex setups, use a custom Dockerfile:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 nodejs && adduser -S -u 1001 nodejs
USER nodejs

# Copy built app
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
```

## Production Best Practices

### 1. Use npm ci for Reproducible Builds

```json
{
  "scripts": {
    "build": "npm ci --only=production && npm run compile"
  }
}
```

### 2. Handle Graceful Shutdown

```javascript
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close database connections
    db.close();
    
    process.exit(0);
  });
  
  // Force close after 30s
  setTimeout(() => {
    console.log('Forcing shutdown');
    process.exit(1);
  }, 30000);
});
```

### 3. Use Proper Logging

```javascript
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
});

// Use structured logging
logger.info({ userId: user.id, action: 'login' }, 'User logged in');
```

### 4. Set Resource Limits

```yaml
# kubidu.yaml
resources:
  cpu: 500m
  memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

### 5. Enable Compression

```javascript
const compression = require('compression');
app.use(compression());
```

## Troubleshooting

### App Not Starting

1. Check logs:
   ```bash
   kubidu logs
   ```

2. Verify `start` script exists:
   ```bash
   npm run start
   ```

3. Ensure PORT is used:
   ```javascript
   app.listen(process.env.PORT || 3000);
   ```

### Build Failing

1. Check Node version in `engines`:
   ```json
   {
     "engines": {
       "node": ">=18.0.0"
     }
   }
   ```

2. Ensure all dependencies are in `dependencies` not `devDependencies`

### Out of Memory

1. Increase memory in kubidu.yaml:
   ```yaml
   resources:
     memory: 1Gi
   ```

2. Or set Node memory limit:
   ```yaml
   env:
     NODE_OPTIONS: "--max-old-space-size=1024"
   ```

## Example: Complete Express API

```javascript
// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pino = require('pino-http');

const app = express();

// Security
app.use(helmet());
app.use(cors());
app.set('trust proxy', 1);

// Logging
app.use(pino());

// Body parsing
app.use(express.json({ limit: '10kb' }));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    name: 'My API',
    version: '1.0.0',
    env: process.env.NODE_ENV 
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handler
app.use((err, req, res, next) => {
  req.log.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

// Start
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
```

## See Also

- [Environment Variables](./variables.md)
- [Custom Domains](./domains.md)
- [Scaling](./scaling.md)
- [Logs](./logs.md)
