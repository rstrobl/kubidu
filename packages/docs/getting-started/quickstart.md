# Quickstart

Deploy your first app in under 5 minutes. No credit card required.

## Prerequisites

- [Node.js](https://nodejs.org) 18+ (for the CLI)
- A project to deploy (we'll use an example if you don't have one)

## 1. Install the CLI

::: code-group

```bash [npm]
npm install -g @kubidu/cli
```

```bash [yarn]
yarn global add @kubidu/cli
```

```bash [pnpm]
pnpm add -g @kubidu/cli
```

:::

Verify the installation:

```bash
kubidu --version
# @kubidu/cli/1.0.0
```

## 2. Log In

```bash
kubidu login
```

This opens your browser to authenticate. Don't have an account? You'll be prompted to create one.

::: tip
Use `kubidu login --token` if you prefer to paste a token directly (useful for CI environments).
:::

## 3. Initialize Your Project

Navigate to your project directory and run:

```bash
cd my-app
kubidu init
```

This creates a `kubidu.json` configuration file:

```json
{
  "name": "my-app",
  "type": "docker",
  "build": {
    "dockerfile": "Dockerfile"
  }
}
```

::: details Don't have a project? Use our example

```bash
git clone https://github.com/kubidu/hello-world
cd hello-world
kubidu init
```

:::

## 4. Deploy

```bash
kubidu deploy
```

That's it! Watch the build logs stream in real-time:

```
⠋ Building image...
✓ Image built in 23s
⠋ Pushing to registry...
✓ Pushed to registry
⠋ Deploying...
✓ Deployed successfully!

🚀 Your app is live at: https://my-app-abc123.kubidu.io
```

## 5. View Your App

Click the URL or run:

```bash
kubidu open
```

Your browser opens to your deployed application.

## What Just Happened?

1. **Built** — Kubidu built your Docker image in the cloud
2. **Pushed** — The image was stored in our secure container registry
3. **Deployed** — A container was started in our EU data centers
4. **Routed** — HTTPS was automatically configured with a free subdomain

## Next Steps

Now that you're deployed, you might want to:

- [Add a custom domain](/configuration/domains)
- [Set environment variables](/configuration/environment-variables)
- [Connect to GitHub](/deployments/github) for automatic deployments
- [Invite your team](/teams/members)

## Common Issues

### "Command not found: kubidu"

Make sure npm's global bin directory is in your PATH:

```bash
export PATH="$PATH:$(npm bin -g)"
```

### Build failed

Check that your `Dockerfile` exists and is valid. Run locally first:

```bash
docker build -t test .
```

### Need help?

- Check our [Troubleshooting guide](/support/troubleshooting)
- Ask in our [Discord community](https://discord.gg/kubidu)
- Email us at support@kubidu.io
