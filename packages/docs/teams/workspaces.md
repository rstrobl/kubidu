# Workspaces

Workspaces help you organize apps, manage access, and separate environments.

## What Are Workspaces?

Think of workspaces as folders for your apps:

```
My Company
├── Production          ← Workspace
│   ├── api             ← App
│   ├── web             ← App
│   └── worker          ← App
├── Staging             ← Workspace
│   ├── api
│   └── web
└── Development         ← Workspace
    └── sandbox
```

Each workspace has:
- Its own apps
- Its own team members
- Its own billing (optional)
- Isolated environment variables and secrets

## Creating Workspaces

### Via CLI

```bash
kubidu workspace create production
```

### Via Dashboard

1. Go to [app.kubidu.io](https://app.kubidu.io)
2. Click the workspace dropdown (top-left)
3. Click "Create Workspace"
4. Enter a name and click "Create"

## Switching Workspaces

### CLI

```bash
# List workspaces
kubidu workspace list

# Switch workspace
kubidu workspace switch production
```

Or use the `--workspace` flag:

```bash
kubidu deploy --workspace production
```

### Dashboard

Click the workspace dropdown in the top-left corner.

## Workspace Settings

### View Settings

```bash
kubidu workspace settings
```

### Update Settings

```bash
# Change name
kubidu workspace settings set name "Production EU"

# Set default region
kubidu workspace settings set region eu-central-1
```

## Common Patterns

### By Environment

```
├── production
├── staging
└── development
```

Best for small teams. Clear separation between environments.

### By Team

```
├── platform-team
├── frontend-team
└── data-team
```

Each team owns their workspace and apps.

### By Product

```
├── product-a
│   ├── api
│   ├── web
│   └── worker
└── product-b
    ├── api
    └── web
```

For companies with multiple products.

### Hybrid

```
├── product-a-production
├── product-a-staging
├── product-b-production
└── product-b-staging
```

Combines product and environment separation.

## Workspace Isolation

Workspaces are fully isolated:

| Feature | Isolated? |
|---------|-----------|
| Apps | ✅ |
| Environment variables | ✅ |
| Secrets | ✅ |
| Team members | ✅ |
| Domains | ✅ |
| Billing | ✅ (optional) |
| Audit logs | ✅ |

## Moving Apps Between Workspaces

```bash
kubidu app move my-app --to staging
```

::: warning
Moving apps resets environment variables. Export them first:
```bash
kubidu env export --app my-app > my-app.env
```
:::

## Workspace Limits

| Plan | Workspaces | Apps per Workspace |
|------|------------|-------------------|
| Free | 1 | 3 |
| Pro | 5 | 10 |
| Team | 20 | 50 |
| Enterprise | Unlimited | Unlimited |

## Default Workspace

Set a default workspace for CLI commands:

```bash
kubidu workspace default production
```

Now all commands use `production` unless overridden:

```bash
# Uses production
kubidu deploy

# Override to staging
kubidu deploy --workspace staging
```

## Workspace Templates

Create new workspaces from templates:

```bash
# Create from template
kubidu workspace create staging --template production
```

This copies:
- App configurations (not deployments)
- Environment variable structure (not values)
- Domain patterns
- Team roles (not members)

## Deleting Workspaces

::: danger
Deleting a workspace permanently removes all apps, data, and configurations.
:::

```bash
# List all apps first
kubidu apps list --workspace staging

# Delete (requires confirmation)
kubidu workspace delete staging
```

Type the workspace name to confirm.

## Workspace-Level Environment Variables

Set variables that apply to all apps in a workspace:

```bash
kubidu workspace env set REGION=eu-central-1
```

App-level variables override workspace-level:

```
Workspace: REGION=eu-central-1, ENV=staging
App:       REGION=us-east-1
Result:    REGION=us-east-1, ENV=staging
```

## Integrations

Configure workspace-level integrations:

```bash
# GitHub
kubidu workspace integrate github --org my-company

# Slack notifications
kubidu workspace integrate slack --webhook https://hooks.slack.com/...

# Datadog monitoring
kubidu workspace integrate datadog --api-key xxx
```
