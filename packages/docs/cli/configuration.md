# CLI Configuration

Customize how the Kubidu CLI behaves.

## Configuration File

The CLI stores configuration in `~/.config/kubidu/config.json`:

```json
{
  "auth": {
    "token": "kbt_xxx..."
  },
  "defaults": {
    "workspace": "production",
    "region": "eu-central-1"
  },
  "preferences": {
    "color": true,
    "interactive": true
  }
}
```

## View Configuration

```bash
# Show all config
kubidu config list

# Show specific value
kubidu config get defaults.workspace
```

## Set Configuration

```bash
kubidu config set <key> <value>
```

Examples:

```bash
# Set default workspace
kubidu config set defaults.workspace production

# Set default region
kubidu config set defaults.region eu-central-1

# Disable colors
kubidu config set preferences.color false
```

## Configuration Options

### Authentication

| Key | Description | Example |
|-----|-------------|---------|
| `auth.token` | API token | `kbt_xxx` |
| `auth.refreshToken` | Refresh token | Auto-managed |

### Defaults

| Key | Description | Example |
|-----|-------------|---------|
| `defaults.workspace` | Default workspace | `production` |
| `defaults.region` | Default region | `eu-central-1` |
| `defaults.app` | Default app | `my-app` |

### Preferences

| Key | Description | Default |
|-----|-------------|---------|
| `preferences.color` | Enable colored output | `true` |
| `preferences.interactive` | Enable prompts | `true` |
| `preferences.editor` | Preferred editor | `$EDITOR` |
| `preferences.pager` | Pager for long output | `less` |

## Environment Variables

Override configuration with environment variables:

| Variable | Description |
|----------|-------------|
| `KUBIDU_TOKEN` | API token |
| `KUBIDU_WORKSPACE` | Default workspace |
| `KUBIDU_API_URL` | API endpoint |
| `KUBIDU_NO_COLOR` | Disable colors |
| `KUBIDU_DEBUG` | Enable debug mode |

Priority order:
1. Command-line flags (highest)
2. Environment variables
3. Config file
4. Defaults (lowest)

Example:

```bash
# Use different workspace for this command
KUBIDU_WORKSPACE=staging kubidu deploy
```

## Project Configuration

Each project has a `kubidu.json` file:

```json
{
  "name": "my-app",
  "type": "docker",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "deploy": {
    "instances": 2,
    "port": 3000
  }
}
```

### Create/Update Project Config

```bash
# Initialize
kubidu init

# Set values
kubidu config set --project deploy.instances 3
```

### Validate Project Config

```bash
kubidu validate
```

## Profiles

Manage multiple configurations with profiles:

```bash
# Create a profile
kubidu config profile create work --workspace acme-corp

# Create another profile
kubidu config profile create personal --workspace my-projects

# Switch profiles
kubidu config profile use work

# List profiles
kubidu config profile list
```

Profile configuration is stored in `~/.config/kubidu/profiles/`:

```
~/.config/kubidu/
├── config.json        # Current config
└── profiles/
    ├── work.json
    └── personal.json
```

## Credential Storage

By default, credentials are stored in the config file. For enhanced security:

### macOS Keychain

```bash
kubidu config set auth.storage keychain
```

### Linux Secret Service

```bash
kubidu config set auth.storage secret-service
```

### Environment Only

Never store credentials on disk:

```bash
kubidu config set auth.storage none
```

Then always provide via environment:

```bash
export KUBIDU_TOKEN=kbt_xxx
```

## API Configuration

### Custom API Endpoint

For enterprise installations:

```bash
kubidu config set api.url https://api.kubidu.mycompany.com
```

### Timeout

Adjust request timeout:

```bash
kubidu config set api.timeout 60000  # 60 seconds
```

### Proxy

Configure HTTP proxy:

```bash
kubidu config set proxy.http http://proxy.example.com:8080
kubidu config set proxy.https https://proxy.example.com:8080
```

Or use environment variables:

```bash
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=https://proxy.example.com:8080
```

## Output Configuration

### JSON Output

Always output JSON:

```bash
kubidu config set preferences.outputFormat json
```

Or per-command:

```bash
kubidu apps list --json
```

### Quiet Mode

Suppress non-essential output:

```bash
kubidu config set preferences.quiet true
```

### Timestamps

Include timestamps in output:

```bash
kubidu config set preferences.timestamps true
```

## Aliases

Create command aliases:

```bash
kubidu config alias set pd "deploy --environment production"
kubidu config alias set sd "deploy --environment staging"
```

Use them:

```bash
kubidu pd  # Expands to: kubidu deploy --environment production
```

List aliases:

```bash
kubidu config alias list
```

## Debug Mode

Enable debug output for troubleshooting:

```bash
KUBIDU_DEBUG=1 kubidu deploy
```

Or persistently:

```bash
kubidu config set preferences.debug true
```

## Reset Configuration

Reset to defaults:

```bash
# Reset specific key
kubidu config unset defaults.workspace

# Reset all config
kubidu config reset
```

## Configuration File Location

Override config file location:

```bash
KUBIDU_CONFIG=/path/to/config.json kubidu deploy
```

## CI/CD Configuration

For CI environments, use environment variables exclusively:

```yaml
# GitHub Actions example
env:
  KUBIDU_TOKEN: ${{ secrets.KUBIDU_TOKEN }}
  KUBIDU_WORKSPACE: production

steps:
  - run: kubidu deploy
```

Disable interactive prompts:

```bash
export KUBIDU_NO_INTERACTIVE=1
```

Or:

```bash
kubidu config set preferences.interactive false
```
