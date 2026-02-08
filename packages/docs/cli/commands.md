# CLI Commands

Complete reference for all Kubidu CLI commands.

## Authentication

### `kubidu login`

Authenticate with Kubidu.

```bash
# Interactive (opens browser)
kubidu login

# With token
kubidu login --token kbt_xxx

# Specify region
kubidu login --region eu
```

### `kubidu logout`

Log out and clear credentials.

```bash
kubidu logout
```

### `kubidu whoami`

Show current authenticated user.

```bash
kubidu whoami
```

---

## Apps

### `kubidu init`

Initialize a new Kubidu project.

```bash
# Interactive setup
kubidu init

# Auto-detect from project
kubidu init --detect

# From template
kubidu init --template nodejs
```

### `kubidu deploy`

Deploy the current project.

```bash
# Deploy
kubidu deploy

# Deploy with message
kubidu deploy --message "Fix login bug"

# Deploy to specific environment
kubidu deploy --environment staging

# Deploy from image
kubidu deploy --image my-app:v1.2.3

# Follow logs
kubidu deploy --follow
```

**Options:**
| Option | Description |
|--------|-------------|
| `--message, -m` | Deployment message |
| `--environment, -e` | Target environment |
| `--image` | Deploy from existing image |
| `--follow, -f` | Stream build logs |
| `--build-arg` | Pass build argument |
| `--no-cache` | Build without cache |

### `kubidu status`

Show app status.

```bash
kubidu status
kubidu status --app my-app
```

### `kubidu apps list`

List all apps in workspace.

```bash
kubidu apps list
```

### `kubidu apps delete`

Delete an app.

```bash
kubidu apps delete my-app
```

---

## Deployments

### `kubidu deployments list`

List deployment history.

```bash
kubidu deployments list
kubidu deployments list --limit 20
```

### `kubidu rollback`

Roll back to a previous version.

```bash
# Roll back to previous version
kubidu rollback

# Roll back to specific version
kubidu rollback --version v23

# Preview without executing
kubidu rollback --dry-run
```

---

## Environment Variables

### `kubidu env list`

List environment variables.

```bash
kubidu env list
kubidu env list --show-values
```

### `kubidu env set`

Set environment variables.

```bash
# Set single variable
kubidu env set DATABASE_URL="postgres://..."

# Set multiple
kubidu env set API_KEY=xxx SECRET=yyy

# Set as secret
kubidu env set --secret API_KEY=xxx

# Set from file
kubidu env set --file .env.production
```

### `kubidu env unset`

Remove environment variables.

```bash
kubidu env unset DATABASE_URL
kubidu env unset API_KEY SECRET
```

### `kubidu env import/export`

```bash
# Import from file
kubidu env import .env.production

# Export to file
kubidu env export > .env.backup
```

---

## Logs

### `kubidu logs`

View application logs.

```bash
# Stream logs
kubidu logs

# Follow mode
kubidu logs --follow

# Filter by level
kubidu logs --level error

# Search
kubidu logs --search "database"

# Time range
kubidu logs --since 1h
kubidu logs --since 2024-01-15T10:00:00

# Build logs
kubidu logs --build
```

**Options:**
| Option | Description |
|--------|-------------|
| `--follow, -f` | Stream new logs |
| `--level` | Filter by level (debug, info, warn, error) |
| `--search` | Search text |
| `--since` | Start time (1h, 24h, 2024-01-15) |
| `--until` | End time |
| `--build` | Show build logs |
| `--version` | Logs for specific version |

---

## Domains

### `kubidu domains list`

List configured domains.

```bash
kubidu domains list
```

### `kubidu domains add`

Add a custom domain.

```bash
kubidu domains add api.example.com
```

### `kubidu domains remove`

Remove a domain.

```bash
kubidu domains remove api.example.com
```

### `kubidu domains verify`

Verify domain ownership.

```bash
kubidu domains verify api.example.com
```

---

## Scaling

### `kubidu scale`

Configure scaling.

```bash
# Set fixed instances
kubidu scale 3

# Enable auto-scaling
kubidu scale auto --min 1 --max 10

# Disable auto-scaling
kubidu scale auto --disable
```

---

## Workspaces

### `kubidu workspace list`

List workspaces.

```bash
kubidu workspace list
```

### `kubidu workspace create`

Create a new workspace.

```bash
kubidu workspace create staging
```

### `kubidu workspace switch`

Switch to a different workspace.

```bash
kubidu workspace switch production
```

### `kubidu workspace delete`

Delete a workspace.

```bash
kubidu workspace delete old-workspace
```

---

## Team Members

### `kubidu members list`

List team members.

```bash
kubidu members list
```

### `kubidu members invite`

Invite a team member.

```bash
kubidu members invite alice@example.com
kubidu members invite bob@example.com --role admin
```

### `kubidu members remove`

Remove a team member.

```bash
kubidu members remove alice@example.com
```

### `kubidu members role`

Change member's role.

```bash
kubidu members role bob@example.com --set admin
```

---

## Configuration

### `kubidu config list`

Show all configuration.

```bash
kubidu config list
```

### `kubidu config set`

Set a configuration value.

```bash
kubidu config set deploy.instances 3
kubidu config set default.workspace production
```

### `kubidu config get`

Get a configuration value.

```bash
kubidu config get deploy.instances
```

### `kubidu validate`

Validate kubidu.json.

```bash
kubidu validate
```

---

## Other Commands

### `kubidu open`

Open app in browser.

```bash
kubidu open
kubidu open --app api
```

### `kubidu exec`

Run a command in the container.

```bash
kubidu exec -- npm run migrate
kubidu exec --interactive -- /bin/sh
```

### `kubidu metrics`

View app metrics.

```bash
kubidu metrics
kubidu metrics --period 24h
```

### `kubidu events`

View events.

```bash
kubidu events
kubidu events --type scaling
```

### `kubidu audit-log`

View audit log.

```bash
kubidu audit-log
kubidu audit-log --user alice@example.com
```

---

## Aliases

Common shortcuts:

```bash
kubidu d      # kubidu deploy
kubidu s      # kubidu status
kubidu l      # kubidu logs
kubidu e      # kubidu env
```
