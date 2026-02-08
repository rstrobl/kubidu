# @kubidu/cli

The official command-line interface for [Kubidu](https://kubidu.dev) - deploy your apps with ease.

## Installation

```bash
npm install -g @kubidu/cli
```

Or with yarn:

```bash
yarn global add @kubidu/cli
```

## Quick Start

```bash
# Login to your account
kubidu login

# Initialize a new project
kubidu init

# Deploy your app
kubidu deploy

# View logs
kubidu logs -f
```

## Commands

### Authentication

| Command | Description |
|---------|-------------|
| `kubidu login` | Authenticate via browser |
| `kubidu login --token <token>` | Authenticate with API token |
| `kubidu logout` | Clear stored credentials |
| `kubidu whoami` | Show current user |

### Projects

| Command | Description |
|---------|-------------|
| `kubidu init` | Initialize new project in current directory |
| `kubidu link` | Link to existing project |

### Deployments

| Command | Description |
|---------|-------------|
| `kubidu deploy` | Deploy current directory |
| `kubidu deploy --watch` | Deploy and watch for changes |
| `kubidu status` | Show deployment status |
| `kubidu status --watch` | Watch status in real-time |
| `kubidu logs` | View deployment logs |
| `kubidu logs -f` | Stream logs (follow mode) |
| `kubidu open` | Open app in browser |
| `kubidu open --dashboard` | Open dashboard in browser |

### Environment Variables

| Command | Description |
|---------|-------------|
| `kubidu env list` | List environment variables |
| `kubidu env list --reveal` | Show secret values |
| `kubidu env set KEY=value` | Set environment variable |
| `kubidu env set KEY=value --secret` | Set as encrypted secret |
| `kubidu env unset KEY` | Remove environment variable |
| `kubidu env pull` | Download to .env file |
| `kubidu env push` | Upload from .env file |

### Services

| Command | Description |
|---------|-------------|
| `kubidu ps` | List services |
| `kubidu ps:scale <n>` | Scale to n replicas |
| `kubidu ps:restart` | Restart all replicas |
| `kubidu ps:stop` | Stop service (scale to 0) |

### Domains

| Command | Description |
|---------|-------------|
| `kubidu domains list` | List custom domains |
| `kubidu domains add <domain>` | Add custom domain |
| `kubidu domains remove <domain>` | Remove custom domain |
| `kubidu domains check <domain>` | Check DNS configuration |

## Configuration

### Global Config

Stored in `~/.config/kubidu/config.json`:

```json
{
  "apiToken": "your-token",
  "apiUrl": "https://api.kubidu.dev",
  "currentProject": "project-id",
  "currentService": "service-id"
}
```

### Project Config

Create `kubidu.yaml` in your project root:

```yaml
name: my-app
service: web

build:
  dockerfile: Dockerfile
  context: .

deploy:
  replicas: 2
  port: 3000
  healthcheck: /health

env:
  NODE_ENV: production
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `KUBIDU_API_TOKEN` | Override authentication token |
| `KUBIDU_API_URL` | Override API endpoint |

## CI/CD Integration

### GitHub Actions

```yaml
- name: Deploy to Kubidu
  env:
    KUBIDU_API_TOKEN: ${{ secrets.KUBIDU_TOKEN }}
  run: |
    npm install -g @kubidu/cli
    kubidu deploy
```

### GitLab CI

```yaml
deploy:
  script:
    - npm install -g @kubidu/cli
    - kubidu login --token $KUBIDU_TOKEN
    - kubidu deploy
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
npm run dev -- <command>

# Create bundle
npm run bundle
```

## License

MIT
