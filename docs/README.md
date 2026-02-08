# Kubidu Documentation

Welcome to Kubidu – the GDPR & ISO 27001 compliant Platform-as-a-Service.

## Quick Links

| Section | Description |
|---------|-------------|
| [Getting Started](./getting-started/) | New to Kubidu? Start here |
| [Guides](./guides/) | In-depth tutorials and how-tos |
| [Reference](./reference/) | CLI, API, and configuration specs |
| [Compliance](./compliance/) | GDPR and ISO 27001 documentation |
| [Troubleshooting](./troubleshooting.md) | Common issues and solutions |

## What is Kubidu?

Kubidu is a modern Platform-as-a-Service that makes deploying applications simple, secure, and compliant. Built for teams that need:

- **Simple Deployments** - Push your code, we handle the rest
- **Enterprise Security** - GDPR and ISO 27001 compliant by design
- **Flexible Scaling** - From hobby projects to production workloads
- **Full Observability** - Logs, metrics, and monitoring included

## 5-Minute Quick Start

```bash
# 1. Install the CLI
npm install -g @kubidu/cli

# 2. Login
kubidu login

# 3. Initialize your project
cd your-project
kubidu init

# 4. Deploy
kubidu deploy

# 5. Open your app
kubidu open
```

That's it! Your app is now live.

## Core Concepts

### Projects

A project is a logical grouping of services. Think of it as a workspace for your application.

### Services

Services are the deployable units within a project. Each service runs your code in one or more containers.

### Deployments

A deployment is a single release of your code. Kubidu keeps a history of all deployments for easy rollbacks.

### Environments

Manage environment variables and secrets securely. All secrets are encrypted at rest using AES-256-GCM.

## Supported Languages & Frameworks

Kubidu auto-detects and builds:

- **Node.js** - npm, yarn, pnpm
- **Python** - pip, poetry, pipenv
- **Go** - Go modules
- **Ruby** - Bundler
- **PHP** - Composer
- **Rust** - Cargo
- **Java** - Maven, Gradle
- **Docker** - Any Dockerfile

## Next Steps

- [Install the CLI](./getting-started/installation.md)
- [Deploy your first app](./getting-started/first-deploy.md)
- [Configure custom domains](./guides/domains.md)
- [Set up environment variables](./guides/variables.md)

## Getting Help

- **Documentation**: You're here!
- **Discord**: [discord.gg/kubidu](https://discord.gg/kubidu)
- **Email**: support@kubidu.dev
- **Status**: [status.kubidu.dev](https://status.kubidu.dev)

## Contributing

Found an issue? Want to improve the docs? PRs welcome at [github.com/kubidu/docs](https://github.com/kubidu/docs).
