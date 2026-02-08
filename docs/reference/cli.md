# CLI Reference

Complete reference for all Kubidu CLI commands.

## Installation

```bash
npm install -g @kubidu/cli
```

## Global Options

| Option | Description |
|--------|-------------|
| `--version`, `-v` | Show version |
| `--help`, `-h` | Show help |
| `--api-url <url>` | Override API endpoint |
| `--token <token>` | Override API token |

## Authentication

### kubidu login

Authenticate with Kubidu.

```bash
kubidu login
kubidu login --token <api-token>
```

| Option | Description |
|--------|-------------|
| `--token <token>` | Use API token (for CI/CD) |

### kubidu logout

Clear stored credentials.

```bash
kubidu logout
kubidu logout --force
```

| Option | Description |
|--------|-------------|
| `-f, --force` | Skip confirmation |

### kubidu whoami

Show current user.

```bash
kubidu whoami
```

## Projects

### kubidu init

Initialize a new project.

```bash
kubidu init
kubidu init --name my-app
kubidu init -y
```

| Option | Description |
|--------|-------------|
| `-n, --name <name>` | Project name |
| `-y, --yes` | Accept defaults |

### kubidu link

Link to existing project.

```bash
kubidu link
kubidu link --project my-app --service web
```

| Option | Description |
|--------|-------------|
| `-p, --project <id>` | Project ID or name |
| `-s, --service <id>` | Service ID or name |

## Deployments

### kubidu deploy

Deploy current directory.

```bash
kubidu deploy
kubidu deploy --watch
kubidu deploy --message "Fix bug"
```

| Option | Description |
|--------|-------------|
| `-w, --watch` | Watch for changes |
| `-m, --message <msg>` | Deployment message |
| `--no-build` | Skip build step |

### kubidu status

Show deployment status.

```bash
kubidu status
kubidu status --watch
```

| Option | Description |
|--------|-------------|
| `-w, --watch` | Watch status changes |

### kubidu logs

View deployment logs.

```bash
kubidu logs
kubidu logs -f
kubidu logs -n 500
kubidu logs --since 1h
```

| Option | Description |
|--------|-------------|
| `-f, --follow` | Stream logs |
| `-n, --lines <n>` | Number of lines (default: 100) |
| `--since <time>` | Show logs since time |
| `--level <level>` | Filter by level |

### kubidu open

Open project in browser.

```bash
kubidu open
kubidu open --dashboard
```

| Option | Description |
|--------|-------------|
| `-d, --dashboard` | Open dashboard |

## Environment Variables

### kubidu env list

List environment variables.

```bash
kubidu env list
kubidu env list --reveal
```

| Option | Description |
|--------|-------------|
| `--reveal` | Show secret values |

### kubidu env set

Set environment variable(s).

```bash
kubidu env set KEY=value
kubidu env set KEY1=val1 KEY2=val2
kubidu env set SECRET=value --secret
```

| Option | Description |
|--------|-------------|
| `-s, --secret` | Mark as secret |

### kubidu env unset

Remove environment variable(s).

```bash
kubidu env unset KEY
kubidu env unset KEY1 KEY2
kubidu env unset KEY --force
```

| Option | Description |
|--------|-------------|
| `-f, --force` | Skip confirmation |

### kubidu env pull

Download to .env file.

```bash
kubidu env pull
kubidu env pull --output .env.local
```

| Option | Description |
|--------|-------------|
| `-o, --output <file>` | Output file (default: .env) |
| `--overwrite` | Overwrite existing |

### kubidu env push

Upload from .env file.

```bash
kubidu env push
kubidu env push --input .env.production
kubidu env push --secret
```

| Option | Description |
|--------|-------------|
| `-i, --input <file>` | Input file (default: .env) |
| `-s, --secret` | Mark all as secrets |

## Services

### kubidu ps

List services.

```bash
kubidu ps
```

### kubidu ps:scale

Scale replicas.

```bash
kubidu ps:scale 3
kubidu ps:scale 0
```

| Argument | Description |
|----------|-------------|
| `<replicas>` | Number of replicas (0-100) |

### kubidu ps:restart

Restart all replicas.

```bash
kubidu ps:restart
```

### kubidu ps:stop

Stop service (scale to 0).

```bash
kubidu ps:stop
```

## Domains

### kubidu domains list

List custom domains.

```bash
kubidu domains list
kubidu domains ls
```

### kubidu domains add

Add custom domain.

```bash
kubidu domains add example.com
```

### kubidu domains remove

Remove custom domain.

```bash
kubidu domains remove example.com
kubidu domains rm example.com --force
```

| Option | Description |
|--------|-------------|
| `-f, --force` | Skip confirmation |

### kubidu domains check

Check DNS configuration.

```bash
kubidu domains check example.com
```

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Authentication required |
| 4 | Resource not found |
| 5 | Permission denied |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `KUBIDU_API_TOKEN` | API token for authentication |
| `KUBIDU_API_URL` | Override API endpoint |
| `KUBIDU_PROJECT` | Default project ID |
| `KUBIDU_SERVICE` | Default service ID |
| `NO_COLOR` | Disable colored output |

## Configuration File

Located at `~/.config/kubidu/config.json`:

```json
{
  "apiToken": "kt_...",
  "apiUrl": "https://api.kubidu.dev",
  "currentProject": "prj_abc123",
  "currentService": "svc_xyz789",
  "theme": "auto"
}
```

## Examples

### Deploy a Node.js app

```bash
cd my-node-app
kubidu login
kubidu init
kubidu env set NODE_ENV=production
kubidu deploy
kubidu open
```

### Set up custom domain

```bash
kubidu domains add myapp.example.com
# Configure DNS CNAME
kubidu domains check myapp.example.com
```

### Watch deployment

```bash
kubidu deploy --watch
# Make changes...
# Auto-redeploy on save
```

### Scale and monitor

```bash
kubidu ps:scale 3
kubidu status --watch
kubidu logs -f
```
