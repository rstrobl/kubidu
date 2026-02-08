# CLI Overview

The Kubidu CLI is your primary tool for deploying and managing applications from the command line.

## Installation

::: code-group

```bash [npm]
npm install -g @kubidu/cli
```

```bash [Homebrew]
brew install kubidu/tap/kubidu
```

```bash [curl]
curl -fsSL https://get.kubidu.io/cli | sh
```

:::

See [Installation](/getting-started/installation) for detailed instructions.

## Quick Start

```bash
# Authenticate
kubidu login

# Initialize a new project
kubidu init

# Deploy
kubidu deploy

# View status
kubidu status
```

## Command Structure

Most commands follow this pattern:

```bash
kubidu <resource> <action> [options]
```

Examples:
- `kubidu app list` — List all apps
- `kubidu env set KEY=value` — Set environment variable
- `kubidu domains add example.com` — Add a domain

## Getting Help

### General Help

```bash
kubidu help
```

### Command-Specific Help

```bash
kubidu deploy --help
kubidu env --help
```

### Version

```bash
kubidu --version
```

## Global Options

These options work with any command:

| Option | Description |
|--------|-------------|
| `--workspace, -w` | Target workspace |
| `--app, -a` | Target app |
| `--json` | Output as JSON |
| `--quiet, -q` | Suppress non-essential output |
| `--verbose, -v` | Show detailed output |
| `--no-color` | Disable colored output |

Example:

```bash
kubidu status --workspace production --app api --json
```

## Configuration

The CLI stores configuration in `~/.config/kubidu/`.

### View Config

```bash
kubidu config list
```

### Set Config

```bash
kubidu config set default.workspace production
```

See [CLI Configuration](/cli/configuration) for details.

## Authentication

### Interactive Login

```bash
kubidu login
```

Opens your browser for authentication.

### Token Login

For CI/CD environments:

```bash
export KUBIDU_TOKEN=kbt_xxx
# or
kubidu login --token kbt_xxx
```

### Check Auth Status

```bash
kubidu whoami
```

## Output Formats

### Table (Default)

```bash
kubidu apps list
```

```
NAME        STATUS    URL                         UPDATED
my-app      running   https://my-app.kubidu.io    5 min ago
api         running   https://api.kubidu.io       1 hour ago
```

### JSON

```bash
kubidu apps list --json
```

```json
[
  {
    "name": "my-app",
    "status": "running",
    "url": "https://my-app.kubidu.io",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

### Quiet

```bash
kubidu apps list --quiet
```

```
my-app
api
```

## Scripting

The CLI is designed for scripting:

```bash
#!/bin/bash

# Deploy and capture URL
url=$(kubidu deploy --json | jq -r '.url')
echo "Deployed to: $url"

# Check status
status=$(kubidu status --json | jq -r '.status')
if [ "$status" != "running" ]; then
  echo "Deployment failed!"
  exit 1
fi
```

## Shell Completion

Enable tab completion:

::: code-group

```bash [Bash]
kubidu completion bash >> ~/.bashrc
```

```bash [Zsh]
kubidu completion zsh >> ~/.zshrc
```

```bash [Fish]
kubidu completion fish > ~/.config/fish/completions/kubidu.fish
```

:::

## Next Steps

- [Command Reference](/cli/commands) — Full list of commands
- [CLI Configuration](/cli/configuration) — Configure the CLI
