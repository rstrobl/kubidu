# Environments

Manage multiple environments (production, staging, development) for your services.

## Overview

Kubidu supports multiple environments per project:

- **Production** - Live traffic, strict deployment rules
- **Staging** - Pre-production testing
- **Development** - Feature development
- **Preview** - Temporary environments for PRs

## Creating Environments

### Via CLI

```bash
kubidu env:create staging
kubidu env:create production
```

### Via Dashboard

1. Go to **Project Settings → Environments**
2. Click **New Environment**
3. Configure settings

## Switching Environments

```bash
# List environments
kubidu env:list

# Switch to staging
kubidu use staging

# Deploy to specific environment
kubidu deploy --env staging
```

## Environment Configuration

### Per-Environment Variables

```bash
# Set for all environments
kubidu env set API_KEY=abc123

# Set for specific environment
kubidu env set --env production DATABASE_URL=postgres://prod...
kubidu env set --env staging DATABASE_URL=postgres://staging...
```

### kubidu.yaml

```yaml
name: my-app
service: web

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
      
  development:
    replicas: 1
    resources:
      cpu: 100m
      memory: 128Mi
    env:
      LOG_LEVEL: trace
```

## Environment Promotion

### Promote to Production

```bash
# Promote staging to production
kubidu promote staging production

# With confirmation
kubidu promote staging production --confirm
```

### Promotion Workflows

```yaml
# .kubidu/promotion.yaml
workflows:
  default:
    stages:
      - development
      - staging
      - production
    
    promotion:
      staging:
        requires:
          - tests_passed
          
      production:
        requires:
          - tests_passed
          - manual_approval
```

## Preview Environments

Automatic environments for pull requests:

### Enable Preview Environments

1. Go to **Settings → Git Integration**
2. Enable **Preview Environments**

### Configuration

```yaml
# .kubidu/preview.yaml
preview:
  enabled: true
  expires_after: 7d     # Auto-delete after 7 days
  
  # Inherit from staging
  base_environment: staging
  
  # Override settings
  replicas: 1
  resources:
    cpu: 100m
    memory: 256Mi
```

### PR Integration

When enabled, Kubidu:
1. Creates environment on PR open
2. Comments with preview URL
3. Updates on each push
4. Deletes on PR merge/close

## Environment Variables

### Scoping

```bash
# Global (all environments)
kubidu env set GLOBAL_VAR=value

# Environment-specific
kubidu env set --env production PROD_VAR=value

# Service-specific
kubidu env set --service api SERVICE_VAR=value
```

### Inheritance

Variables cascade:
1. Global → Environment → Service
2. More specific overrides less specific

Example:
```
LOG_LEVEL=info (global)
LOG_LEVEL=debug (staging) → staging uses debug
LOG_LEVEL=warn (production) → production uses warn
```

## Protected Environments

### Enable Protection

```bash
kubidu env:protect production
```

Protected environments:
- Require approval for deployments
- Can't be deleted accidentally
- Audit logging enabled

### Approval Workflow

```yaml
# .kubidu/protection.yaml
protection:
  production:
    required_reviewers: 2
    allowed_users:
      - lead-dev@example.com
      - cto@example.com
    
    deployment_window:
      days: [monday, tuesday, wednesday, thursday]
      hours: "09:00-17:00"
      timezone: Europe/Berlin
```

## Environment Isolation

Each environment is fully isolated:
- Separate Kubernetes namespace
- Isolated network policies
- Independent resource quotas
- Separate secrets storage

## Environment Cloning

Clone an environment with all variables:

```bash
# Clone staging to create new-feature environment
kubidu env:clone staging new-feature

# Clone without variables
kubidu env:clone staging new-feature --no-vars
```

## Cleanup

### Delete Environment

```bash
# Delete environment
kubidu env:delete preview-123

# Force delete (skip confirmation)
kubidu env:delete preview-123 --force
```

### Auto-Cleanup

Configure automatic cleanup for preview environments:

```yaml
preview:
  ttl: 7d              # Delete after 7 days of inactivity
  max_environments: 10 # Keep max 10 preview environments
```

## Best Practices

1. **Production Parity**: Keep staging as close to production as possible
2. **Secrets Management**: Never commit secrets; use `kubidu env set --secret`
3. **Resource Limits**: Set appropriate limits per environment
4. **Protection**: Always protect production
5. **Naming**: Use consistent naming: `my-app-production`, `my-app-staging`

## See Also

- [Environment Variables](./variables.md)
- [Deployments](./deployments.md)
- [Teams & Permissions](./teams.md)
