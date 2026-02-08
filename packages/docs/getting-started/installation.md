# Installation

This guide covers installing the Kubidu CLI and setting up your account.

## CLI Installation

### npm (Recommended)

```bash
npm install -g @kubidu/cli
```

### Homebrew (macOS/Linux)

```bash
brew install kubidu/tap/kubidu
```

### Binary Download

Download the latest binary for your platform from our [releases page](https://github.com/kubidu/cli/releases):

::: code-group

```bash [macOS (Apple Silicon)]
curl -fsSL https://get.kubidu.io/cli | sh
```

```bash [macOS (Intel)]
curl -fsSL https://get.kubidu.io/cli | sh
```

```bash [Linux]
curl -fsSL https://get.kubidu.io/cli | sh
```

```powershell [Windows]
iwr -useb https://get.kubidu.io/cli.ps1 | iex
```

:::

### Verify Installation

```bash
kubidu --version
```

You should see something like:

```
@kubidu/cli/1.0.0 darwin-arm64 node-v20.0.0
```

## Account Setup

### Create an Account

If you don't have a Kubidu account yet:

1. Visit [app.kubidu.io/signup](https://app.kubidu.io/signup)
2. Sign up with GitHub, GitLab, or email
3. Verify your email address

### Authenticate the CLI

```bash
kubidu login
```

This opens your browser to complete authentication. The CLI receives a secure token that's stored locally.

::: tip Pro Tip
Use `kubidu whoami` to check which account you're logged into:

```bash
kubidu whoami
# Logged in as: alice@example.com
# Workspace: my-team
```

:::

### Token-Based Authentication

For CI/CD pipelines or headless environments, use a token:

1. Generate a token at [app.kubidu.io/settings/tokens](https://app.kubidu.io/settings/tokens)
2. Set it as an environment variable:

```bash
export KUBIDU_TOKEN=kbt_abc123...
```

Or pass it directly:

```bash
kubidu login --token kbt_abc123...
```

## Dashboard Access

The Kubidu Dashboard is available at [app.kubidu.io](https://app.kubidu.io).

From the dashboard, you can:

- Create and manage deployments
- Configure environment variables
- Set up custom domains
- Manage team members and workspaces
- View logs and metrics
- Access billing and usage

## IDE Extensions

### VS Code

Install the [Kubidu VS Code extension](https://marketplace.visualstudio.com/items?itemName=kubidu.vscode-kubidu) for:

- Syntax highlighting for `kubidu.json`
- Inline deployment status
- Quick deploy commands
- Log streaming

```bash
code --install-extension kubidu.vscode-kubidu
```

### JetBrains IDEs

Install from the [JetBrains Marketplace](https://plugins.jetbrains.com/plugin/kubidu).

## Configuration

### Config File Location

The CLI stores configuration in:

| Platform | Location |
|----------|----------|
| macOS    | `~/.config/kubidu/config.json` |
| Linux    | `~/.config/kubidu/config.json` |
| Windows  | `%APPDATA%\kubidu\config.json` |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `KUBIDU_TOKEN` | Authentication token |
| `KUBIDU_WORKSPACE` | Default workspace |
| `KUBIDU_API_URL` | API endpoint (for enterprise) |
| `KUBIDU_NO_COLOR` | Disable colored output |

## Updating

### npm

```bash
npm update -g @kubidu/cli
```

### Homebrew

```bash
brew upgrade kubidu
```

### Auto-Update

The CLI checks for updates automatically and will notify you when a new version is available.

## Uninstalling

### npm

```bash
npm uninstall -g @kubidu/cli
```

### Homebrew

```bash
brew uninstall kubidu
```

### Clean Up Config

Remove stored configuration:

```bash
rm -rf ~/.config/kubidu
```

## Next Steps

- [Deploy your first app](/getting-started/quickstart)
- [Explore CLI commands](/cli/commands)
- [Configure your project](/configuration/)
