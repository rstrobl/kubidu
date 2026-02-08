# Configuration Reference

Complete reference for `kubidu.yaml` configuration.

## Basic Structure

```yaml
# kubidu.yaml
name: my-app
service: web

build:
  dockerfile: Dockerfile
  context: .

deploy:
  replicas: 2
  port: 3000

env:
  NODE_ENV: production
```

## Root Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Project name |
| `service` | string | Yes | Service name |
| `version` | string | No | Config version (default: "1") |

## Build Configuration

```yaml
build:
  dockerfile: Dockerfile       # Path to Dockerfile
  context: .                   # Build context directory
  target: production           # Multi-stage build target
  args:                        # Build arguments
    NODE_ENV: production
    VERSION: "1.0.0"
  cache: true                  # Enable layer caching
  platforms:                   # Target platforms
    - linux/amd64
    - linux/arm64
```

### Build Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `dockerfile` | string | `Dockerfile` | Dockerfile path |
| `context` | string | `.` | Build context |
| `target` | string | - | Multi-stage target |
| `args` | object | - | Build-time args |
| `cache` | boolean | `true` | Layer caching |
| `platforms` | array | `[linux/amd64]` | Target platforms |

### Auto-Detection

If no Dockerfile exists, Kubidu auto-detects:

| File | Builder |
|------|---------|
| `package.json` | Node.js (Nixpacks) |
| `requirements.txt` | Python (Nixpacks) |
| `go.mod` | Go (Nixpacks) |
| `Gemfile` | Ruby (Nixpacks) |
| `Cargo.toml` | Rust (Nixpacks) |

## Deploy Configuration

```yaml
deploy:
  replicas: 2                  # Number of instances
  port: 3000                   # Container port
  healthcheck: /health         # Health endpoint
  healthcheck_interval: 30     # Check interval (seconds)
  healthcheck_timeout: 5       # Timeout per check
  healthcheck_retries: 3       # Retries before unhealthy
  timeout: 300                 # Deploy timeout (seconds)
  strategy: rolling            # Deployment strategy
  shutdown_grace_period: 30    # Graceful shutdown time
```

### Deploy Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `replicas` | integer | `1` | Instance count (0-100) |
| `port` | integer | Auto | Container port |
| `healthcheck` | string | - | Health endpoint path |
| `healthcheck_interval` | integer | `30` | Check interval (s) |
| `healthcheck_timeout` | integer | `5` | Check timeout (s) |
| `healthcheck_retries` | integer | `3` | Retries before fail |
| `timeout` | integer | `300` | Deploy timeout (s) |
| `strategy` | string | `rolling` | `rolling` or `recreate` |
| `shutdown_grace_period` | integer | `30` | Shutdown time (s) |

### Healthcheck Command

Alternative to HTTP healthcheck:

```yaml
deploy:
  healthcheck_command:
    - curl
    - -f
    - http://localhost:3000/health
```

## Resources

```yaml
resources:
  cpu: 500m                    # CPU request (millicores)
  memory: 512Mi                # Memory request
  
  limits:
    cpu: 1000m                 # CPU limit
    memory: 1Gi                # Memory limit
```

### Resource Units

| CPU | Description |
|-----|-------------|
| `100m` | 0.1 cores |
| `500m` | 0.5 cores |
| `1000m` or `1` | 1 core |
| `2000m` or `2` | 2 cores |

| Memory | Description |
|--------|-------------|
| `128Mi` | 128 MiB |
| `512Mi` | 512 MiB |
| `1Gi` | 1 GiB |
| `4Gi` | 4 GiB |

## Scaling

```yaml
scaling:
  auto: true                   # Enable auto-scaling
  min: 1                       # Minimum replicas
  max: 10                      # Maximum replicas
  target_cpu: 70               # Target CPU %
  target_memory: 80            # Target memory %
  target_requests: 1000        # Target requests/min
  
  scale_up:
    cooldown: 30               # Cooldown between scale-ups
    step: 2                    # Replicas per scale-up
    
  scale_down:
    cooldown: 300              # Cooldown between scale-downs
    step: 1                    # Replicas per scale-down
```

## Environment Variables

```yaml
env:
  NODE_ENV: production
  LOG_LEVEL: info
  API_URL: https://api.example.com
```

### Variable Substitution

```yaml
env:
  # Reference other variables
  DATABASE_URL: "${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}"
  
  # Reference from other services
  REDIS_URL: "${redis.CONNECTION_URL}"
```

### Secrets

Secrets should be set via CLI, not in config:

```bash
kubidu env set DATABASE_PASSWORD=secret --secret
```

## Domains

```yaml
domains:
  primary: app.example.com     # Primary domain
  redirects:                   # Redirect domains
    - www.example.com
    - example.com
```

## Headers

```yaml
headers:
  # Security headers
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: "1; mode=block"
  Referrer-Policy: strict-origin-when-cross-origin
  
  # Custom headers
  X-Custom-Header: value
```

## CORS

```yaml
cors:
  enabled: true
  origins:
    - https://app.example.com
    - https://admin.example.com
  methods:
    - GET
    - POST
    - PUT
    - DELETE
  headers:
    - Content-Type
    - Authorization
  credentials: true
  max_age: 86400
```

## Routing

```yaml
routing:
  # Path-based routing
  - path: /api/*
    service: api
    strip_prefix: true
    
  - path: /static/*
    service: cdn
    
  - path: /*
    service: web
```

## Environments

```yaml
environments:
  production:
    replicas: 3
    resources:
      cpu: 1000m
      memory: 1Gi
    env:
      LOG_LEVEL: warn
      
  staging:
    replicas: 1
    resources:
      cpu: 250m
      memory: 256Mi
    env:
      LOG_LEVEL: debug
```

## Volumes

```yaml
volumes:
  - name: data
    path: /app/data
    size: 10Gi
    
  - name: cache
    path: /tmp/cache
    type: ephemeral
```

## Cron Jobs

```yaml
cron:
  - name: cleanup
    schedule: "0 0 * * *"      # Daily at midnight
    command: npm run cleanup
    
  - name: reports
    schedule: "0 9 * * 1"      # Monday 9 AM
    command: npm run weekly-report
```

## Alerts

```yaml
alerts:
  - name: high_error_rate
    condition: error_rate > 0.01
    window: 5m
    severity: critical
    notifications:
      - email: team@example.com
      - slack: ${SLACK_WEBHOOK}
      
  - name: high_latency
    condition: p95_latency > 500ms
    window: 5m
    severity: warning
```

## Logging

```yaml
logging:
  level: info
  format: json
  
  exports:
    - type: datadog
      api_key: ${DATADOG_API_KEY}
```

## Complete Example

```yaml
# kubidu.yaml
name: my-saas-app
service: web
version: "1"

build:
  dockerfile: Dockerfile
  context: .
  target: production
  args:
    NODE_ENV: production

deploy:
  replicas: 2
  port: 3000
  healthcheck: /health
  healthcheck_interval: 30
  timeout: 300
  strategy: rolling
  shutdown_grace_period: 30

resources:
  cpu: 500m
  memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi

scaling:
  auto: true
  min: 2
  max: 10
  target_cpu: 70

env:
  NODE_ENV: production
  LOG_LEVEL: info
  LOG_FORMAT: json

domains:
  primary: app.example.com
  redirects:
    - www.example.com

headers:
  X-Frame-Options: DENY
  Content-Security-Policy: "default-src 'self'"

cors:
  enabled: true
  origins:
    - https://app.example.com

environments:
  production:
    replicas: 3
    env:
      LOG_LEVEL: warn
      
  staging:
    replicas: 1
    env:
      LOG_LEVEL: debug

cron:
  - name: cleanup
    schedule: "0 2 * * *"
    command: npm run cleanup

alerts:
  - name: errors
    condition: error_rate > 0.01
    severity: critical
```

## Validation

Validate your config:

```bash
kubidu config validate

# ✔ kubidu.yaml is valid
```

## See Also

- [CLI Reference](./cli.md)
- [API Reference](./api.md)
- [Deployments Guide](../guides/deployments.md)
