# Teams

Collaborate with your team on Kubidu projects.

## Overview

Teams let you:
- Share projects with colleagues
- Control access with roles
- Audit team activity
- Manage billing together

## Creating a Team

### Via Dashboard

1. Go to **Settings → Teams**
2. Click **Create Team**
3. Enter team name
4. Invite members

### Via CLI

```bash
kubidu teams create "My Team"
```

## Inviting Members

### Invite by Email

```bash
kubidu teams invite user@example.com --role developer
```

Roles:
- **owner** - Full access, can delete team
- **admin** - Manage members, settings
- **developer** - Deploy, view logs
- **viewer** - Read-only access

### Pending Invites

```bash
kubidu teams invites list
```

## Role Permissions

| Permission | Owner | Admin | Developer | Viewer |
|------------|-------|-------|-----------|--------|
| View projects | ✅ | ✅ | ✅ | ✅ |
| View logs | ✅ | ✅ | ✅ | ✅ |
| Deploy | ✅ | ✅ | ✅ | ❌ |
| Manage env vars | ✅ | ✅ | ✅ | ❌ |
| Manage domains | ✅ | ✅ | ✅ | ❌ |
| Create projects | ✅ | ✅ | ❌ | ❌ |
| Delete projects | ✅ | ✅ | ❌ | ❌ |
| Manage members | ✅ | ✅ | ❌ | ❌ |
| Billing | ✅ | ❌ | ❌ | ❌ |
| Delete team | ✅ | ❌ | ❌ | ❌ |

## Managing Members

### List Members

```bash
kubidu teams members

# EMAIL                ROLE        JOINED
# ──────────────────────────────────────────
# alice@example.com    owner       2024-01-01
# bob@example.com      admin       2024-01-05
# charlie@example.com  developer   2024-01-10
```

### Change Role

```bash
kubidu teams members update bob@example.com --role developer
```

### Remove Member

```bash
kubidu teams members remove charlie@example.com
```

## Project Access

### Team Projects

All team members can access team projects based on their role:

```bash
# Create project for team
kubidu init --team "My Team"

# List team projects
kubidu projects --team "My Team"
```

### Transfer Project

Move a personal project to a team:

```bash
kubidu projects transfer my-app --team "My Team"
```

## API Tokens

### Team Tokens

Create shared API tokens for CI/CD:

```bash
kubidu teams tokens create "CI/CD Token" --role developer

# TOKEN: kt_abc123...
# ⚠ Save this token - it won't be shown again
```

### List Tokens

```bash
kubidu teams tokens list

# NAME           ROLE        CREATED      LAST USED
# ──────────────────────────────────────────────────
# CI/CD Token    developer   2024-01-01   2024-01-15
```

### Revoke Token

```bash
kubidu teams tokens revoke "CI/CD Token"
```

## Audit Log

### View Activity

```bash
kubidu teams audit

# TIMESTAMP            USER                  ACTION
# ──────────────────────────────────────────────────
# 2024-01-15 12:00:00  alice@example.com     deployed web
# 2024-01-15 11:30:00  bob@example.com       env.set API_KEY
# 2024-01-15 11:00:00  alice@example.com     invited charlie
```

### Filter Audit Log

```bash
# By user
kubidu teams audit --user bob@example.com

# By action
kubidu teams audit --action deploy

# By date
kubidu teams audit --since 2024-01-01

# Export
kubidu teams audit --format json > audit.json
```

## SSO Integration

### SAML

1. Go to **Team Settings → SSO**
2. Choose SAML
3. Configure with your IdP

Supported IdPs:
- Okta
- Azure AD
- Google Workspace
- OneLogin
- Custom SAML 2.0

### OIDC

```yaml
# Team Settings
sso:
  type: oidc
  issuer: https://auth.example.com
  client_id: kubidu-app
  client_secret: ${SSO_SECRET}
```

## SCIM Provisioning

Automatic user provisioning:

1. Enable SCIM in **Team Settings → Provisioning**
2. Get SCIM endpoint and token
3. Configure in your IdP

Syncs:
- User creation/deletion
- Group membership
- Role assignments

## Billing

### Team Billing

All team usage billed to team account:

```bash
kubidu teams billing

# PLAN: Pro
# USAGE THIS MONTH:
# • Compute: $45.00
# • Storage: $5.00
# • Bandwidth: $12.00
# ─────────────────
# TOTAL: $62.00
```

### Spending Limits

```bash
kubidu teams billing limit set 100 --currency USD
```

Notifications at 50%, 80%, 100% of limit.

### Payment Methods

Manage in dashboard:
1. **Team Settings → Billing**
2. Add/update payment method
3. View invoices

## Team Settings

### General

```bash
# Rename team
kubidu teams rename "New Team Name"

# Get team ID
kubidu teams info
```

### Defaults

```yaml
# Team settings
defaults:
  region: eu-central-1
  plan: pro
  auto_scaling: true
```

### Delete Team

```bash
# Requires confirmation
kubidu teams delete

# Force delete (dangerous!)
kubidu teams delete --force
```

⚠️ Deleting a team:
- Deletes all projects
- Removes all members
- Cannot be undone

## Best Practices

### 1. Use Descriptive Roles

Create custom permissions:

```bash
# Create QA role (viewer + deploy to staging)
kubidu teams roles create qa \
  --inherit viewer \
  --allow "deploy:staging"
```

### 2. Rotate Tokens

```bash
# Rotate CI/CD tokens periodically
kubidu teams tokens rotate "CI/CD Token"
```

### 3. Enable SSO

For teams >5 people, enable SSO for:
- Centralized access control
- Automatic offboarding
- Compliance requirements

### 4. Review Audit Logs

Regularly review:
- Production deployments
- Environment changes
- Member access changes

### 5. Use Team Tokens for CI

Never use personal tokens in CI/CD:
- Use team tokens with minimal permissions
- Rotate regularly
- Scope to specific projects

## See Also

- [GDPR Compliance](../compliance/gdpr.md)
- [ISO 27001](../compliance/iso27001.md)
- [Environments](./environments.md)
