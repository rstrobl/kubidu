# Environment Variables Best Practices

A comprehensive guide to managing configuration and secrets securely on Kubidu.

## Overview

Environment variables are the standard way to configure applications. This guide covers:
- When to use environment variables
- Secrets vs regular variables
- Naming conventions
- Security best practices
- Common patterns

## Quick Reference

```bash
# Set regular variable
kubidu env set NODE_ENV=production

# Set secret (encrypted)
kubidu env set DATABASE_URL=postgres://... --secret

# List all variables
kubidu env list

# Remove variable
kubidu env unset OLD_VAR
```

## When to Use Environment Variables

### ✅ DO Use For

| Use Case | Example |
|----------|---------|
| Database connections | `DATABASE_URL` |
| API keys | `STRIPE_API_KEY` |
| Feature flags | `ENABLE_FEATURE_X` |
| Service URLs | `API_ENDPOINT` |
| Logging configuration | `LOG_LEVEL` |
| Runtime configuration | `PORT`, `NODE_ENV` |

### ❌ DON'T Use For

| Use Case | Better Alternative |
|----------|-------------------|
| Large files | Object storage (S3) |
| Binary data | Object storage |
| Complex configs | Config files in repo |
| Build-time only values | Build args |
| Static content | Commit to repo |

## Secrets vs Regular Variables

### Regular Variables

For non-sensitive configuration:

```bash
kubidu env set NODE_ENV=production
kubidu env set LOG_LEVEL=info
kubidu env set MAX_ITEMS_PER_PAGE=50
```

- Visible in dashboard
- Logged in audit trail
- OK to share

### Secrets

For sensitive data:

```bash
kubidu env set DATABASE_URL=postgres://user:pass@host/db --secret
kubidu env set API_KEY=sk_live_xxx --secret
kubidu env set JWT_SECRET=your-secret-key --secret
```

- Encrypted at rest (AES-256-GCM)
- Masked in dashboard and logs
- Never exposed in API responses
- Audit logged (access, not values)

### What Should Be a Secret?

Always use `--secret` for:
- Database credentials
- API keys and tokens
- JWT secrets
- Encryption keys
- OAuth client secrets
- Webhook secrets
- Private keys
- Password hashes/salts

## Naming Conventions

### General Rules

1. **SCREAMING_SNAKE_CASE**
   ```bash
   DATABASE_URL=...        # ✅ Good
   database_url=...        # ❌ Bad
   databaseUrl=...         # ❌ Bad
   ```

2. **Descriptive Names**
   ```bash
   STRIPE_SECRET_KEY=...   # ✅ Good
   KEY=...                 # ❌ Bad
   SK=...                  # ❌ Bad
   ```

3. **Prefixes for Grouping**
   ```bash
   DATABASE_HOST=...
   DATABASE_PORT=...
   DATABASE_NAME=...
   DATABASE_USER=...
   DATABASE_PASSWORD=...
   
   REDIS_URL=...
   REDIS_PASSWORD=...
   
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=...
   ```

### Common Patterns

| Pattern | Example |
|---------|---------|
| URLs | `DATABASE_URL`, `API_ENDPOINT` |
| Credentials | `AWS_SECRET_ACCESS_KEY` |
| Feature flags | `ENABLE_FEATURE_X`, `FEATURE_NEW_UI` |
| Modes | `NODE_ENV`, `DEBUG_MODE` |
| Limits | `MAX_CONNECTIONS`, `RATE_LIMIT` |
| Timeouts | `REQUEST_TIMEOUT_MS` |

## Environment-Specific Variables

### Set Per Environment

```bash
# Production
kubidu env set DATABASE_URL=postgres://prod... --secret --env production
kubidu env set LOG_LEVEL=warn --env production

# Staging
kubidu env set DATABASE_URL=postgres://staging... --secret --env staging
kubidu env set LOG_LEVEL=debug --env staging

# Development
kubidu env set DATABASE_URL=postgres://dev... --secret --env development
kubidu env set LOG_LEVEL=trace --env development
```

### Using kubidu.yaml

```yaml
# kubidu.yaml
env:
  # Shared across all environments
  LOG_FORMAT: json
  MAX_REQUEST_SIZE: 10mb

environments:
  production:
    env:
      LOG_LEVEL: warn
      RATE_LIMIT: 1000
      FEATURE_BETA: "false"
      
  staging:
    env:
      LOG_LEVEL: debug
      RATE_LIMIT: 100
      FEATURE_BETA: "true"
      
  development:
    env:
      LOG_LEVEL: trace
      RATE_LIMIT: 10000
      FEATURE_BETA: "true"
```

## Accessing Variables in Code

### Node.js

```javascript
// Direct access
const dbUrl = process.env.DATABASE_URL;

// With default
const port = process.env.PORT || 3000;

// With validation
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY environment variable is required');
}

// Type conversion
const maxItems = parseInt(process.env.MAX_ITEMS || '100', 10);
const debugMode = process.env.DEBUG === 'true';
```

### Python

```python
import os

# Direct access
db_url = os.environ['DATABASE_URL']

# With default
port = int(os.environ.get('PORT', 3000))

# With validation
api_key = os.environ.get('API_KEY')
if not api_key:
    raise ValueError('API_KEY environment variable is required')
```

### Go

```go
import "os"

// Direct access
dbURL := os.Getenv("DATABASE_URL")

// With validation
apiKey := os.Getenv("API_KEY")
if apiKey == "" {
    log.Fatal("API_KEY environment variable is required")
}
```

## Validation Pattern

Create a validation module to catch missing variables at startup:

### Node.js Example

```javascript
// config.js
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name, defaultValue) {
  return process.env[name] || defaultValue;
}

// Export validated config
module.exports = {
  // Required
  database: {
    url: requireEnv('DATABASE_URL'),
  },
  
  // Optional with defaults
  server: {
    port: parseInt(optionalEnv('PORT', '3000'), 10),
    host: optionalEnv('HOST', '0.0.0.0'),
  },
  
  // Feature flags
  features: {
    newUi: optionalEnv('FEATURE_NEW_UI', 'false') === 'true',
    betaAccess: optionalEnv('FEATURE_BETA', 'false') === 'true',
  },
};
```

### Usage

```javascript
const config = require('./config');

// Fails fast at startup if DATABASE_URL is missing
console.log(config.database.url);
```

## Security Best Practices

### 1. Never Commit Secrets

```gitignore
# .gitignore
.env
.env.local
.env.*.local
*.pem
*.key
```

### 2. Use .env.example

```bash
# .env.example (commit this)
DATABASE_URL=postgres://localhost:5432/myapp
API_KEY=your_api_key_here
JWT_SECRET=generate_a_random_string

# .env (don't commit this)
DATABASE_URL=postgres://user:realpassword@prod-db/myapp
API_KEY=sk_live_xxx
JWT_SECRET=actual-secret-key
```

### 3. Rotate Secrets Regularly

```bash
# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# Update in Kubidu
kubidu env set JWT_SECRET="$NEW_SECRET" --secret

# Deploy to apply
kubidu deploy
```

### 4. Use Separate Keys Per Environment

```bash
# Each environment has its own API key
kubidu env set --env production STRIPE_KEY=sk_live_prod...
kubidu env set --env staging STRIPE_KEY=sk_test_staging...
```

### 5. Audit Access

```bash
# View who accessed secrets
kubidu teams audit --action env.reveal
```

## Common Patterns

### Feature Flags

```bash
kubidu env set FEATURE_NEW_CHECKOUT=true
kubidu env set FEATURE_DARK_MODE=false
kubidu env set FEATURE_BETA_ACCESS=true
```

```javascript
if (process.env.FEATURE_NEW_CHECKOUT === 'true') {
  // New checkout flow
}
```

### Service Discovery

```bash
kubidu env set AUTH_SERVICE_URL=https://auth.internal
kubidu env set PAYMENT_SERVICE_URL=https://payment.internal
kubidu env set EMAIL_SERVICE_URL=https://email.internal
```

### Multi-Tenant Configuration

```bash
kubidu env set DEFAULT_TENANT=default
kubidu env set TENANT_CONFIG_URL=https://config.api/tenants
```

### Build vs Runtime

Build-time (in Dockerfile):
```dockerfile
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
```

Runtime (in Kubidu):
```bash
kubidu env set API_ENDPOINT=https://api.production.com
```

## Bulk Operations

### Import from .env File

```bash
# Create .env file
cat > .env << EOF
NODE_ENV=production
LOG_LEVEL=info
API_URL=https://api.example.com
EOF

# Import
kubidu env push

# Import all as secrets
kubidu env push --secret
```

### Export to .env File

```bash
# Export (secrets masked)
kubidu env pull

# Export with secrets revealed
kubidu env pull --reveal

# Export to specific file
kubidu env pull -o .env.production
```

### Sync Between Environments

```bash
# Export from staging
kubidu env pull --env staging -o .env.staging

# Push to production (review first!)
kubidu env push --env production -i .env.staging
```

## Troubleshooting

### Variable Not Available

1. Check it's set:
   ```bash
   kubidu env list
   ```

2. Redeploy after setting:
   ```bash
   kubidu deploy
   ```

3. Check spelling in code matches exactly

### Secret Value Incorrect

1. Re-set the secret:
   ```bash
   kubidu env set DATABASE_URL="correct-value" --secret
   ```

2. Verify no extra whitespace:
   ```bash
   # Bad - has trailing newline
   kubidu env set API_KEY="$(cat key.txt)"
   
   # Good - trimmed
   kubidu env set API_KEY="$(cat key.txt | tr -d '\n')"
   ```

### Variables Not Updating

```bash
# Force sync and redeploy
kubidu env sync
kubidu deploy
```

## Documentation Template

Document your environment variables in README:

```markdown
## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host/db` |
| `JWT_SECRET` | Secret for JWT signing | Random 32+ char string |
| `API_KEY` | External API key | `sk_live_xxx` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `LOG_LEVEL` | `info` | Logging level |
| `FEATURE_BETA` | `false` | Enable beta features |

### Getting Started

```bash
cp .env.example .env
# Edit .env with your values
```
```

## See Also

- [Environment Variables Reference](./variables.md)
- [Environments Guide](./environments.md)
- [Database Connection](./database-connection.md)
- [Security - GDPR](../compliance/gdpr.md)
