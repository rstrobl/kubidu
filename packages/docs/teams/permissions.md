# Permissions

Detailed breakdown of roles and permissions in Kubidu.

## Role Overview

| Role | Best For |
|------|----------|
| **Viewer** | Stakeholders, project managers who need visibility |
| **Developer** | Engineers who deploy and manage apps |
| **Admin** | Team leads who manage people and resources |
| **Owner** | Account owner, handles billing and critical settings |

## Permission Matrix

### Apps

| Permission | Viewer | Developer | Admin | Owner |
|------------|--------|-----------|-------|-------|
| View apps | ✅ | ✅ | ✅ | ✅ |
| View app details | ✅ | ✅ | ✅ | ✅ |
| Create app | ❌ | ✅ | ✅ | ✅ |
| Deploy app | ❌ | ✅ | ✅ | ✅ |
| Rollback | ❌ | ✅ | ✅ | ✅ |
| Delete app | ❌ | ❌ | ✅ | ✅ |

### Environment Variables

| Permission | Viewer | Developer | Admin | Owner |
|------------|--------|-----------|-------|-------|
| View variables (names) | ✅ | ✅ | ✅ | ✅ |
| View values | ❌ | ✅ | ✅ | ✅ |
| Set variables | ❌ | ✅ | ✅ | ✅ |
| Delete variables | ❌ | ✅ | ✅ | ✅ |
| View secrets | ❌ | ❌ | ✅ | ✅ |

### Logs & Metrics

| Permission | Viewer | Developer | Admin | Owner |
|------------|--------|-----------|-------|-------|
| View logs | ✅ | ✅ | ✅ | ✅ |
| View metrics | ✅ | ✅ | ✅ | ✅ |
| Export logs | ❌ | ✅ | ✅ | ✅ |
| Configure alerts | ❌ | ✅ | ✅ | ✅ |

### Domains

| Permission | Viewer | Developer | Admin | Owner |
|------------|--------|-----------|-------|-------|
| View domains | ✅ | ✅ | ✅ | ✅ |
| Add domains | ❌ | ✅ | ✅ | ✅ |
| Remove domains | ❌ | ✅ | ✅ | ✅ |

### Team Management

| Permission | Viewer | Developer | Admin | Owner |
|------------|--------|-----------|-------|-------|
| View members | ✅ | ✅ | ✅ | ✅ |
| Invite members | ❌ | ❌ | ✅ | ✅ |
| Remove members | ❌ | ❌ | ✅ | ✅ |
| Change roles | ❌ | ❌ | ✅ | ✅ |
| Transfer ownership | ❌ | ❌ | ❌ | ✅ |

### Workspace Settings

| Permission | Viewer | Developer | Admin | Owner |
|------------|--------|-----------|-------|-------|
| View settings | ✅ | ✅ | ✅ | ✅ |
| Update settings | ❌ | ❌ | ✅ | ✅ |
| Delete workspace | ❌ | ❌ | ❌ | ✅ |
| Manage integrations | ❌ | ❌ | ✅ | ✅ |

### Billing

| Permission | Viewer | Developer | Admin | Owner |
|------------|--------|-----------|-------|-------|
| View usage | ❌ | ❌ | ✅ | ✅ |
| View invoices | ❌ | ❌ | ❌ | ✅ |
| Update payment | ❌ | ❌ | ❌ | ✅ |
| Change plan | ❌ | ❌ | ❌ | ✅ |

## Custom Roles (Enterprise)

Enterprise plans can create custom roles:

```bash
kubidu roles create qa-engineer \
  --permission app.view \
  --permission app.deploy \
  --permission log.view \
  --permission log.export
```

### Assign Custom Role

```bash
kubidu members invite qa@example.com --role qa-engineer
```

### List Custom Roles

```bash
kubidu roles list
```

## API Token Permissions

API tokens inherit the creator's permissions. Create limited tokens:

```bash
kubidu tokens create --name deploy-bot --permissions deploy,logs.view
```

Available permissions:
- `app.*` — All app permissions
- `app.view` — View apps
- `app.deploy` — Deploy apps
- `env.*` — All environment variable permissions
- `logs.view` — View logs
- `logs.export` — Export logs
- `domains.*` — All domain permissions

## Audit Log

All permission-related actions are logged:

```bash
kubidu audit-log --type permissions
```

```
TIME                  USER           ACTION              DETAILS
2024-01-15 10:30:00  owner@...      role.change         bob: developer → admin
2024-01-15 10:15:00  admin@...      member.invite       alice@...: developer
2024-01-15 09:00:00  admin@...      member.remove       old@...
```

## Permission Inheritance

### Workspace vs App Permissions

Workspace-level permissions apply to all apps:

```bash
# Has developer access to ALL apps
kubidu members invite dev@example.com --role developer
```

App-level permissions are more restrictive:

```bash
# Has developer access ONLY to my-app
kubidu members invite dev@example.com --role developer --app my-app
```

### Multiple Assignments

If a user has multiple role assignments, the highest permission wins:

```
Workspace: viewer
App (my-app): developer
Result in my-app: developer (higher)
Result in other-app: viewer (workspace default)
```

## Security Recommendations

### 1. Minimize Admin Access

Most team members should be Developers, not Admins:

```
Typical Team:
- 1 Owner
- 1-2 Admins (team leads)
- Many Developers
- Few Viewers (stakeholders)
```

### 2. Use App-Level Access for Contractors

```bash
kubidu members invite contractor@agency.com \
  --role developer \
  --app frontend-app \
  --expires 30d
```

### 3. Separate Production Access

Use different workspaces for production:

```bash
# Development workspace: many developers
kubidu members invite dev@example.com --role developer --workspace dev

# Production workspace: fewer people
kubidu members invite senior@example.com --role developer --workspace prod
```

### 4. Require Approval for Sensitive Actions

Enable approval workflows (Enterprise):

```bash
kubidu settings set require-approval-for delete.app
kubidu settings set require-approval-for env.secret
```

## Troubleshooting

### "Permission denied"

Check your role:

```bash
kubidu whoami
```

Ask an admin to upgrade your permissions:

```bash
kubidu members role you@example.com --set developer
```

### Can't see certain apps

You might have app-level access. Check your assignments:

```bash
kubidu members show you@example.com
```

### Token doesn't work

Tokens inherit creator permissions. If the creator's role changed, recreate the token:

```bash
kubidu tokens revoke old-token
kubidu tokens create --name new-token
```
