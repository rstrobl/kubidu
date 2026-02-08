# Environment Variables

Manage configuration and secrets for your applications securely.

## Setting Variables

### Via CLI

```bash
# Set a single variable
kubidu env set DATABASE_URL="postgres://..."

# Set multiple variables
kubidu env set API_KEY="xxx" SECRET_KEY="yyy"

# Set from a file
kubidu env set --file .env.production
```

### Via Dashboard

1. Go to your app in the [Dashboard](https://app.kubidu.io)
2. Click "Settings" → "Environment Variables"
3. Add your variables
4. Click "Save & Deploy"

### In kubidu.json

For non-sensitive configuration:

```json
{
  "env": {
    "NODE_ENV": "production",
    "PORT": "3000",
    "LOG_LEVEL": "info"
  }
}
```

::: warning
Never put secrets in `kubidu.json`. It's committed to version control. Use `kubidu env set` for secrets.
:::

## Viewing Variables

```bash
# List all variables (values hidden)
kubidu env list

# Show values (careful in shared terminals!)
kubidu env list --show-values
```

```
KEY                VALUE
DATABASE_URL       ****
API_KEY            ****
NODE_ENV           production
PORT               3000
```

## Removing Variables

```bash
# Remove a single variable
kubidu env unset DATABASE_URL

# Remove multiple variables
kubidu env unset API_KEY SECRET_KEY
```

## Secret Management

### How Secrets Are Stored

Kubidu encrypts all environment variables at rest using AES-256. Variables are:

- Encrypted in our database
- Decrypted only at deploy time
- Injected into your container at runtime
- Never written to disk in plaintext

### Secret Types

Mark variables as secrets for additional protection:

```bash
kubidu env set --secret DATABASE_URL="postgres://..."
```

Secrets are:
- Hidden in logs
- Excluded from backups
- Require additional authentication to view

### Linking External Secrets

Connect to external secret managers:

```bash
# AWS Secrets Manager
kubidu secrets link aws --secret-id my-app/production

# HashiCorp Vault
kubidu secrets link vault --path secret/data/my-app
```

## Environment-Specific Variables

Different values for different environments:

```bash
# Production
kubidu env set --environment production DATABASE_URL="postgres://prod..."

# Staging
kubidu env set --environment staging DATABASE_URL="postgres://staging..."
```

View environment-specific variables:

```bash
kubidu env list --environment production
```

## Variable Expansion

Reference other variables:

```bash
kubidu env set BASE_URL="https://api.example.com"
kubidu env set API_ENDPOINT="${BASE_URL}/v1"
```

## Reserved Variables

These variables are set automatically by Kubidu:

| Variable | Description |
|----------|-------------|
| `PORT` | Port your app should listen on |
| `KUBIDU_APP` | Your app name |
| `KUBIDU_VERSION` | Current deployment version |
| `KUBIDU_ENVIRONMENT` | Current environment (production, staging) |
| `KUBIDU_REGION` | Deployment region |

::: tip
Always use `process.env.PORT` (or equivalent) instead of hardcoding a port.
:::

## Build vs Runtime Variables

### Runtime Variables (Default)

Available when your app runs:

```bash
kubidu env set API_KEY="xxx"
```

### Build-Time Variables

Available during Docker build:

```bash
kubidu env set --build NPM_TOKEN="xxx"
```

In your Dockerfile:

```dockerfile
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
```

## Bulk Operations

### Import from File

```bash
# Import from .env file
kubidu env import .env.production

# Import and overwrite existing
kubidu env import .env.production --overwrite
```

### Export to File

```bash
# Export all variables
kubidu env export > .env.backup

# Export specific environment
kubidu env export --environment production > .env.production
```

## Syncing with Local Development

### Pull Remote Variables

```bash
# Download to .env file
kubidu env pull > .env.local
```

### Push Local Variables

```bash
# Upload from .env file
kubidu env push .env.local
```

## Access in Your App

::: code-group

```javascript [Node.js]
const dbUrl = process.env.DATABASE_URL;
const port = process.env.PORT || 3000;
```

```python [Python]
import os
db_url = os.environ.get('DATABASE_URL')
port = int(os.environ.get('PORT', 3000))
```

```go [Go]
dbUrl := os.Getenv("DATABASE_URL")
port := os.Getenv("PORT")
```

```ruby [Ruby]
db_url = ENV['DATABASE_URL']
port = ENV['PORT'] || 3000
```

:::

## Best Practices

### 1. Use Descriptive Names

```bash
# Good
DATABASE_PRIMARY_URL
STRIPE_API_KEY_PRODUCTION

# Avoid
DB
KEY
```

### 2. Separate Secrets from Config

```bash
# Secrets (use --secret)
kubidu env set --secret DATABASE_URL="..."
kubidu env set --secret API_KEY="..."

# Config (ok in kubidu.json)
{
  "env": {
    "LOG_LEVEL": "info",
    "MAX_CONNECTIONS": "100"
  }
}
```

### 3. Use Environment-Specific Variables

Don't use the same database for staging and production.

### 4. Rotate Secrets Regularly

```bash
# Update a secret
kubidu env set --secret API_KEY="new-key"

# Kubidu automatically redeploys
```

## Troubleshooting

### "Variable not found"

1. Check the variable is set: `kubidu env list`
2. Verify the environment: `kubidu env list --environment production`
3. Redeploy if you just added it: `kubidu deploy`

### "Permission denied"

Only workspace admins can modify secrets. Check your role:

```bash
kubidu whoami
```

### Variables changed but app didn't update

Environment variable changes require a redeploy:

```bash
kubidu deploy
```

Or enable auto-deploy on env change:

```json
{
  "deploy": {
    "redeployOnEnvChange": true
  }
}
```
