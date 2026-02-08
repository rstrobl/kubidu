# Installation

Install the Kubidu CLI on your system.

## Requirements

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher (included with Node.js)

## Install via npm

The recommended way to install the Kubidu CLI:

```bash
npm install -g @kubidu/cli
```

## Install via yarn

```bash
yarn global add @kubidu/cli
```

## Install via pnpm

```bash
pnpm add -g @kubidu/cli
```

## Verify Installation

```bash
kubidu --version
# @kubidu/cli/0.1.0

kubidu --help
```

## Update

To update to the latest version:

```bash
npm update -g @kubidu/cli
```

## Uninstall

```bash
npm uninstall -g @kubidu/cli
```

## Alternative: Binary Download

Pre-built binaries are available for:

- **Linux** (x64, arm64)
- **macOS** (x64, arm64)
- **Windows** (x64)

Download from [GitHub Releases](https://github.com/kubidu/cli/releases).

### Linux / macOS

```bash
# Download (replace VERSION and ARCH)
curl -fsSL https://github.com/kubidu/cli/releases/latest/download/kubidu-linux-x64 -o kubidu

# Make executable
chmod +x kubidu

# Move to PATH
sudo mv kubidu /usr/local/bin/
```

### Windows

1. Download `kubidu-win-x64.exe`
2. Rename to `kubidu.exe`
3. Add to your PATH

## CI/CD Installation

### GitHub Actions

```yaml
- name: Install Kubidu CLI
  run: npm install -g @kubidu/cli

- name: Deploy
  env:
    KUBIDU_API_TOKEN: ${{ secrets.KUBIDU_TOKEN }}
  run: kubidu deploy
```

### GitLab CI

```yaml
deploy:
  image: node:18
  script:
    - npm install -g @kubidu/cli
    - kubidu login --token $KUBIDU_TOKEN
    - kubidu deploy
```

### Docker

```dockerfile
FROM node:18-alpine

RUN npm install -g @kubidu/cli

# Your build steps...
```

## Shell Completion

### Bash

```bash
kubidu completion bash >> ~/.bashrc
source ~/.bashrc
```

### Zsh

```bash
kubidu completion zsh >> ~/.zshrc
source ~/.zshrc
```

### Fish

```bash
kubidu completion fish > ~/.config/fish/completions/kubidu.fish
```

## Configuration

The CLI stores configuration in:

- **Linux/macOS**: `~/.config/kubidu/config.json`
- **Windows**: `%APPDATA%\kubidu\config.json`

## Proxy Configuration

If you're behind a corporate proxy:

```bash
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
```

## Troubleshooting

### Permission Denied (EACCES)

If you get permission errors with npm global install:

```bash
# Option 1: Use npx (no global install needed)
npx @kubidu/cli deploy

# Option 2: Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g @kubidu/cli
```

### Command Not Found

Ensure the npm global bin is in your PATH:

```bash
npm bin -g
# Add this path to your PATH if not already there
```

### SSL Certificate Errors

For self-signed certificates (corporate environments):

```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0  # Not recommended for production
```

Or configure your CA:

```bash
export NODE_EXTRA_CA_CERTS=/path/to/ca.crt
```

## Next Steps

- [Login to your account](./quickstart.md#step-2-login)
- [Deploy your first app](./first-deploy.md)
