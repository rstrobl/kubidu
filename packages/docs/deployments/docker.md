# Docker Deployments

Kubidu provides first-class support for Docker. Bring your own Dockerfile or let us generate one for you.

## Using Your Dockerfile

If your project has a `Dockerfile`, Kubidu will use it automatically:

```bash
kubidu init
kubidu deploy
```

### Dockerfile Best Practices

For optimal builds on Kubidu:

```dockerfile
# Use specific versions
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build if needed
RUN npm run build

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
```

### Multi-Stage Builds

We recommend multi-stage builds for smaller images:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Auto-Detection (Buildpacks)

No Dockerfile? Kubidu can generate one automatically:

```bash
kubidu init --detect
```

Supported languages/frameworks:

| Language | Detected By |
|----------|-------------|
| Node.js | `package.json` |
| Python | `requirements.txt`, `Pipfile` |
| Go | `go.mod` |
| Ruby | `Gemfile` |
| PHP | `composer.json` |
| Rust | `Cargo.toml` |
| Java | `pom.xml`, `build.gradle` |

### Node.js Example

With just a `package.json`, Kubidu creates:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Port Configuration

Kubidu automatically detects the port from:

1. `EXPOSE` in Dockerfile
2. `PORT` environment variable
3. Common defaults (3000, 8080, 8000)

Override in `kubidu.json`:

```json
{
  "deploy": {
    "port": 8080
  }
}
```

## Health Checks

Configure health checks to ensure your app is ready:

```json
{
  "deploy": {
    "healthCheck": {
      "path": "/health",
      "port": 8080,
      "interval": 30,
      "timeout": 5,
      "retries": 3
    }
  }
}
```

### Health Check Endpoint

Your app should respond with HTTP 200:

```javascript
// Express example
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});
```

## Build Context

By default, Kubidu uses the current directory as build context. Customize it:

```json
{
  "build": {
    "context": "./backend",
    "dockerfile": "./backend/Dockerfile"
  }
}
```

## .dockerignore

Speed up builds by ignoring unnecessary files:

```gitignore
node_modules
.git
*.md
.env*
test/
coverage/
```

## Build Arguments

Pass build-time arguments:

::: code-group

```bash [CLI]
kubidu deploy \
  --build-arg NODE_ENV=production \
  --build-arg API_URL=https://api.example.com
```

```json [kubidu.json]
{
  "build": {
    "args": {
      "NODE_ENV": "production",
      "API_URL": "https://api.example.com"
    }
  }
}
```

:::

::: warning Security
Never pass secrets as build arguments! They're visible in the image history. Use [environment variables](/configuration/environment-variables) instead.
:::

## Private Registries

Deploy from a private registry:

```bash
kubidu deploy --image ghcr.io/my-org/my-app:latest
```

Configure registry credentials:

```bash
kubidu registry add ghcr.io --username my-user --password-stdin
```

## Deploying Pre-Built Images

Skip the build step entirely:

```bash
# Deploy from Docker Hub
kubidu deploy --image my-app:v1.2.3

# Deploy from GitHub Container Registry
kubidu deploy --image ghcr.io/my-org/my-app:latest

# Deploy from AWS ECR
kubidu deploy --image 123456789.dkr.ecr.eu-central-1.amazonaws.com/my-app:latest
```

## Build Logs

View build logs in real-time:

```bash
kubidu deploy --follow
```

Or after the fact:

```bash
kubidu logs --build
```

## Troubleshooting

### Build fails with "no space left on device"

Your image might be too large. Consider:
- Using multi-stage builds
- Adding more entries to `.dockerignore`
- Using smaller base images (`alpine` variants)

### "Port not exposed"

Make sure your Dockerfile has an `EXPOSE` instruction, or configure the port explicitly:

```bash
kubidu deploy --port 8080
```

### Slow builds

1. Order Dockerfile instructions from least to most frequently changing
2. Use `.dockerignore` to exclude unnecessary files
3. Enable BuildKit (already default on Kubidu)
