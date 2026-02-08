# Team Members

Invite teammates, manage roles, and control access to your Kubidu workspaces.

## Inviting Members

### Via CLI

```bash
kubidu members invite alice@example.com
```

By default, invites grant the `developer` role. Specify a role:

```bash
kubidu members invite bob@example.com --role admin
```

### Via Dashboard

1. Go to your workspace in the [Dashboard](https://app.kubidu.io)
2. Click "Settings" → "Team"
3. Click "Invite Member"
4. Enter email and select role
5. Click "Send Invite"

## Pending Invites

View outstanding invitations:

```bash
kubidu members invites
```

```
EMAIL                    ROLE        INVITED         EXPIRES
alice@example.com        developer   2 days ago      in 5 days
```

### Resend or Cancel

```bash
# Resend invitation
kubidu members invite alice@example.com --resend

# Cancel invitation
kubidu members invite alice@example.com --cancel
```

## Managing Members

### List Members

```bash
kubidu members list
```

```
NAME               EMAIL                    ROLE        STATUS    JOINED
Alice Smith        alice@example.com        admin       active    2 months ago
Bob Johnson        bob@example.com          developer   active    1 month ago
Charlie Brown      charlie@example.com      viewer      inactive  1 week ago
```

### Change Role

```bash
kubidu members role bob@example.com --set admin
```

### Remove Member

```bash
kubidu members remove charlie@example.com
```

::: warning
Removed members immediately lose access to all resources in the workspace.
:::

## Available Roles

| Role | Description |
|------|-------------|
| **Viewer** | Read-only access. View apps, logs, metrics. |
| **Developer** | Deploy apps, manage environment variables, view secrets. |
| **Admin** | Everything above + invite members, delete apps, manage settings. |
| **Owner** | Everything above + billing, delete workspace, transfer ownership. |

See [Permissions](/teams/permissions) for detailed permission matrix.

## Role Hierarchy

```
Owner
  ↓
Admin
  ↓
Developer
  ↓
Viewer
```

You can only assign roles equal to or below your own.

## App-Level Access

Grant access to specific apps instead of the entire workspace:

```bash
kubidu members add bob@example.com --app my-app --role developer
```

Bob can only see and deploy `my-app`, not other apps in the workspace.

### List App-Level Access

```bash
kubidu members list --app my-app
```

## Bulk Operations

### Import from CSV

```csv
email,role
alice@example.com,developer
bob@example.com,developer
charlie@example.com,viewer
```

```bash
kubidu members import team.csv
```

### Export Members

```bash
kubidu members export > team.csv
```

## Member Activity

View what team members are doing:

```bash
kubidu audit-log --user alice@example.com
```

```
TIME                  ACTION              RESOURCE
2024-01-15 10:30:00  deploy              my-app
2024-01-15 10:15:00  env.set             my-app
2024-01-15 09:00:00  app.create          new-app
```

## Deactivating Members

Temporarily disable access without removing:

```bash
kubidu members deactivate bob@example.com
```

Reactivate later:

```bash
kubidu members activate bob@example.com
```

Deactivated members:
- Cannot log in
- Cannot use API tokens
- Retain their role and history
- Don't count against seat limits

## Security Best Practices

### 1. Principle of Least Privilege

Give users the minimum access needed:

```bash
# Good: Specific access
kubidu members invite ci@example.com --role developer --app api

# Avoid: Broad access
kubidu members invite ci@example.com --role admin
```

### 2. Regular Access Reviews

Audit your team quarterly:

```bash
kubidu members list --include-activity
```

Remove inactive members:

```bash
kubidu members remove inactive@example.com
```

### 3. Require Two-Factor Authentication

```bash
kubidu settings set require-2fa true
```

### 4. Use SSO for Enterprise

With SSO, user lifecycle is managed automatically:
- New employees get access via identity provider
- Departing employees lose access immediately

## Transfer Ownership

Transfer workspace ownership to another admin:

```bash
kubidu workspace transfer-ownership --to alice@example.com
```

Requirements:
- You must be the current owner
- New owner must be an admin
- New owner must have 2FA enabled

## Machine Users

Create accounts for CI/CD and automation:

```bash
kubidu members create-machine github-actions --role developer
```

This creates an API token. Store it securely:

```
Created machine user: github-actions
Token: kbt_xxxxxxxxxxxxx

⚠️  Save this token now. You won't see it again.
```

### Machine User Best Practices

1. Use descriptive names (`github-actions`, `gitlab-ci`)
2. Grant minimal permissions
3. Rotate tokens regularly
4. Use app-level access when possible

## Notifications

Configure how members receive notifications:

```bash
# View notification settings
kubidu members notifications alice@example.com

# Update settings
kubidu members notifications alice@example.com \
  --deploys email \
  --alerts slack \
  --billing off
```
