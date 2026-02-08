# Environment Variables

Securely manage configuration and secrets for your services.

## Overview

Environment variables let you:
- Configure your application without code changes
- Store secrets securely (encrypted at rest)
- Change configuration between environments

## Managing Variables

### Set Variables

```bash
# Set a variable
kubidu env set PORT=3000

# Set multiple variables
kubidu env set NODE_ENV=production LOG_LEVEL=info

# Set as secret (encrypted)
kubidu env set DATABASE_URL=postgres://... --secret
kubidu env set API_KEY=sk-abc123 --secret
```

### List Variables

```bash
# List all variables
kubidu env list

# Output:
# KEY           VALUE        TYPE
# ────────────────────────────────
# PORT          3000
# NODE_ENV      production
# DATABASE_URL  ********     secret
# API_KEY       ********     secret

# Reveal secret values
kubidu env list --reveal
```

### Remove Variables

```bash
# Remove a variable
kubidu env unset PORT

# Remove multiple
kubidu env unset PORT NODE_ENV

# Force (skip confirmation)
kubidu env unset PORT --force
```

## Secrets

### What are Secrets?

Secrets are encrypted environment variables. They:
- Are encrypted at rest with AES-256-GCM
- Are never logged
- Are masked in the dashboard
- Have audit logging

### Setting Secrets

```bash
kubidu env set DATABASE_URL=postgres://user:pass@host/db --secret
kubidu env set STRIPE_KEY=sk_live_... --secret
kubidu env set JWT_SECRET=your-jwt-secret --secret
```

### Viewing Secrets

Secrets are masked by default:

```bash
kubidu env list
# DATABASE_URL  ********  secret

kubidu env list --reveal
# DATABASE_URL  postgres://user:pass@host/db  secret
```

## Bulk Operations

### Export to .env File

```bash
# Download to .env
kubidu env pull

# Download to custom file
kubidu env pull --output .env.production

# Output:
# ✔ Saved 5 variable(s) to .env
# ⚠ Do not commit this file to version control!
```

### Import from .env File

```bash
# Upload from .env
kubidu env push

# Upload from custom file
kubidu env push --input .env.production

# Mark all as secrets
kubidu env push --secret
```

### .env Format

```env
# Comments are ignored
PORT=3000
NODE_ENV=production

# Quotes are stripped
DATABASE_URL="postgres://user:pass@host/db"

# Multiline values
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA...
-----END RSA PRIVATE KEY-----"
```

## Variable References

Reference variables from other services:

```bash
# Reference format: ${service.VAR_NAME}
kubidu env set API_URL='${api.INTERNAL_URL}'
```

### Cross-Service References

```yaml
# kubidu.yaml for web service
env:
  API_URL: "${api.INTERNAL_URL}"
  REDIS_URL: "${redis.CONNECTION_URL}"
```

Kubidu resolves these at runtime.

## Runtime Variables

Kubidu automatically provides these variables:

| Variable | Description |
|----------|-------------|
| `PORT` | Port your app should listen on |
| `KUBIDU_SERVICE` | Service name |
| `KUBIDU_PROJECT` | Project name |
| `KUBIDU_ENVIRONMENT` | Environment name |
| `KUBIDU_REGION` | Deployment region |
| `KUBIDU_DEPLOYMENT_ID` | Current deployment ID |

## Environment-Specific Variables

### Set Per Environment

```bash
# Production
kubidu env set --env production DATABASE_URL=postgres://prod...

# Staging
kubidu env set --env staging DATABASE_URL=postgres://staging...
```

### kubidu.yaml

```yaml
name: my-app
service: web

env:
  # Default for all environments
  LOG_FORMAT: json

environments:
  production:
    env:
      LOG_LEVEL: warn
      RATE_LIMIT: 1000
      
  staging:
    env:
      LOG_LEVEL: debug
      RATE_LIMIT: 100
```

## Variable Precedence

Variables are resolved in this order (later overrides earlier):

1. Runtime variables (PORT, KUBIDU_*)
2. Global project variables
3. Environment-specific variables
4. Service-specific variables
5. kubidu.yaml env section

## Best Practices

### DO ✅

```bash
# Use descriptive names
kubidu env set DATABASE_CONNECTION_STRING=... --secret

# Group related vars
kubidu env set \
  REDIS_HOST=redis.example.com \
  REDIS_PORT=6379 \
  REDIS_PASSWORD=... --secret

# Document in README
# Required environment variables:
# - DATABASE_URL: PostgreSQL connection string
# - REDIS_URL: Redis connection string
```

### DON'T ❌

```bash
# Don't commit .env files with secrets
# Add to .gitignore:
.env
.env.local
.env.production

# Don't use generic names
kubidu env set KEY=...  # Bad
kubidu env set PASSWORD=...  # Bad

# Don't hardcode in code
const key = "sk-abc123"  # Bad
const key = process.env.API_KEY  # Good
```

## Security

### Encryption

- All secrets encrypted with AES-256-GCM
- Unique encryption key per project
- Keys stored in secure vault

### Access Control

- Only team members can view/modify
- Audit logging for all operations
- Role-based permissions

### Compliance

- GDPR compliant data handling
- ISO 27001 certified
- SOC 2 Type II audited

See [GDPR Compliance](../compliance/gdpr.md) for details.

## Troubleshooting

### Variable Not Available

1. Check variable exists: `kubidu env list`
2. Verify correct environment: `kubidu env list --env production`
3. Redeploy after changes: `kubidu deploy`

### Secret Not Working

1. Check it's marked as secret: `kubidu env list`
2. Verify correct format (no extra spaces/quotes)
3. Check application reads correctly

### Sync Issues

Force refresh:

```bash
kubidu env sync
kubidu deploy
```

## See Also

- [Environments](./environments.md)
- [Deployments](./deployments.md)
- [GDPR Compliance](../compliance/gdpr.md)
