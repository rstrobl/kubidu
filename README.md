# Kubidu

[![Build Status](https://img.shields.io/github/actions/workflow/status/kubidu/kubidu/ci.yml?branch=main)](https://github.com/kubidu/kubidu/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@kubidu/cli.svg)](https://www.npmjs.com/package/@kubidu/cli)
[![ISO 27001](https://img.shields.io/badge/ISO-27001:2022-green.svg)](./docs/compliance/iso27001.md)
[![GDPR](https://img.shields.io/badge/GDPR-Compliant-green.svg)](./docs/compliance/gdpr.md)

**Deploy your apps with ease.** Kubidu is a GDPR & ISO 27001 compliant Platform-as-a-Service that makes deployment simple, secure, and scalable.

[Website](https://kubidu.dev) · [Documentation](./docs/README.md) · [CLI Reference](./docs/reference/cli.md) · [API Reference](./docs/reference/api.md)

---

## ✨ Features

### 🚀 Simple Deployments
- **Git Push to Deploy** - Connect your repo, push code, we handle the rest
- **Auto-Detection** - Supports Node.js, Python, Go, Ruby, Rust, Java, and Docker
- **Zero-Downtime** - Blue-green deployments with automatic rollback
- **Watch Mode** - Deploy on file save during development

### 🔒 Enterprise Security
- **GDPR Compliant** - Data processing agreement included, EU data residency
- **ISO 27001 Certified** - Comprehensive security controls
- **Encrypted Secrets** - AES-256-GCM encryption for all environment variables
- **SSO Integration** - SAML 2.0, OIDC, and SCIM support

### 📈 Scalable Infrastructure
- **Auto-Scaling** - Scale based on CPU, memory, or custom metrics
- **Multi-Region** - Deploy globally with geo-routing
- **Custom Domains** - Automatic SSL via Let's Encrypt
- **Load Balancing** - Multiple algorithms supported

### 👀 Full Observability
- **Real-Time Logs** - Stream logs from your services
- **Metrics Dashboard** - CPU, memory, and request metrics
- **Alerts** - Configurable alerts via email, Slack, or webhook
- **Audit Logging** - Complete audit trail for compliance

---

## 🚀 Quick Start

### 1. Install the CLI

```bash
npm install -g @kubidu/cli
```

### 2. Login

```bash
kubidu login
```

### 3. Deploy

```bash
cd your-project
kubidu init
kubidu deploy
```

### 4. Open Your App

```bash
kubidu open
```

That's it! Your app is live at `https://your-service.kubidu.app` 🎉

---

## 📖 Documentation

| Section | Description |
|---------|-------------|
| [Getting Started](./docs/getting-started/) | Installation, quickstart, first deploy |
| [Guides](./docs/guides/) | Deployments, scaling, domains, teams |
| [CLI Reference](./docs/reference/cli.md) | All CLI commands |
| [API Reference](./docs/reference/api.md) | REST API documentation |
| [Configuration](./docs/reference/configuration.md) | kubidu.yaml reference |
| [Compliance](./docs/compliance/) | GDPR & ISO 27001 documentation |
| [Troubleshooting](./docs/troubleshooting.md) | Common issues and solutions |

---

## 🛠 CLI Commands

```bash
kubidu login                    # Authenticate
kubidu init                     # Initialize project
kubidu deploy                   # Deploy current directory
kubidu deploy --watch           # Deploy and watch for changes
kubidu logs -f                  # Stream logs
kubidu env set KEY=value        # Set environment variable
kubidu env set SECRET --secret  # Set encrypted secret
kubidu ps:scale 3               # Scale to 3 replicas
kubidu domains add example.com  # Add custom domain
kubidu status                   # Show deployment status
kubidu open                     # Open in browser
```

[Full CLI Reference →](./docs/reference/cli.md)

---

## 📦 Architecture

```
kubidu/
├── packages/
│   ├── api/              # Main REST API (NestJS)
│   ├── web/              # Dashboard (React)
│   ├── cli/              # Command-line interface
│   ├── shared/           # Shared types and utilities
│   ├── build-service/    # Docker image builder
│   ├── deploy-controller/ # Kubernetes orchestration
│   └── webhook-service/  # GitHub/GitLab webhooks
├── infrastructure/       # Terraform & Kubernetes configs
├── docs/                 # Documentation
└── scripts/             # Setup and utility scripts
```

---

## 🔧 Self-Hosting

### Prerequisites

- Docker Desktop or Docker Engine + Compose
- Node.js 18+
- 8GB+ RAM recommended

### Setup

```bash
# Clone the repository
git clone https://github.com/kubidu/kubidu.git
cd kubidu

# Run setup script
./scripts/setup.sh

# Install dependencies
npm install

# Build all packages
npm run build

# Start all services
docker-compose up
```

### Access Points

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3000 |
| API | http://localhost:4000 |
| Docs | http://localhost:3001 |

---

## 🧪 Development

```bash
# Install dependencies
npm install

# Build packages
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Start development mode
npm run dev
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🔗 Links

- **Website**: [kubidu.dev](https://kubidu.dev)
- **Documentation**: [docs.kubidu.dev](https://docs.kubidu.dev)
- **Discord**: [discord.gg/kubidu](https://discord.gg/kubidu)
- **Twitter**: [@kubidudev](https://twitter.com/kubidudev)
- **Status**: [status.kubidu.dev](https://status.kubidu.dev)

---

<p align="center">
  Built with ❤️ in Berlin
</p>
