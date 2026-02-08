# FAQ

Frequently asked questions about Kubidu.

## General

### What is Kubidu?

Kubidu is a cloud deployment platform designed for European companies. We make it easy to deploy, scale, and manage applications while staying compliant with GDPR and other regulations.

### How is Kubidu different from Heroku/Railway/Render?

- **EU-first**: All data stored in Germany, GDPR compliant by default
- **Compliance**: ISO 27001 certified, DPA included
- **Sustainability**: 100% renewable energy
- **Pricing**: Transparent, no hidden costs

### Where are Kubidu servers located?

All infrastructure is in EU data centers:
- Frankfurt, Germany (primary)
- Amsterdam, Netherlands (backup)

Data never leaves the EU unless you explicitly configure it.

### Is Kubidu GDPR compliant?

Yes. Kubidu is designed for GDPR compliance:
- EU data residency
- Data Processing Agreement included
- Right to deletion tools built-in
- Encryption at rest and in transit

See [GDPR Compliance](/compliance/gdpr) for details.

---

## Deployments

### What languages/frameworks are supported?

Kubidu supports any language via Docker:

- Node.js
- Python
- Go
- Ruby
- PHP
- Java
- Rust
- ...and anything else that runs in a container

### How do I deploy?

Three commands:

```bash
kubidu login
kubidu init
kubidu deploy
```

See the [Quickstart](/getting-started/quickstart) for details.

### How long do deployments take?

Typical deployment times:

| Type | Duration |
|------|----------|
| Small Node.js app | 30-60 seconds |
| Large app with dependencies | 2-5 minutes |
| First deploy (no cache) | 3-10 minutes |

### Can I deploy from GitHub?

Yes! Connect your repository:

```bash
kubidu link github
```

Every push to your main branch triggers a deployment automatically.

### What happens if a deployment fails?

- Your previous version stays live
- No downtime
- You get notified via email/Slack
- Logs are available for debugging

### Can I roll back?

Yes, instantly:

```bash
kubidu rollback
```

See [Rollbacks](/deployments/rollbacks).

---

## Domains & SSL

### Can I use my own domain?

Yes! Add it via:

```bash
kubidu domains add api.example.com
```

Then configure your DNS. See [Custom Domains](/configuration/domains).

### Is SSL included?

Yes, free SSL certificates via Let's Encrypt:
- Automatically provisioned
- Auto-renewed
- No configuration needed

### How do I set up a root domain?

For apex domains (e.g., `example.com` instead of `www.example.com`):

1. Use a DNS provider that supports ALIAS/ANAME records, or
2. Use our static IP addresses for A records

See [Custom Domains](/configuration/domains#for-root-domains).

---

## Scaling & Performance

### Does Kubidu auto-scale?

Yes! Configure auto-scaling:

```bash
kubidu scale auto --min 1 --max 10
```

See [Auto-Scaling](/configuration/scaling).

### What are the resource limits?

| Plan | Max RAM | Max vCPU |
|------|---------|----------|
| Free | 512 MB | 0.5 |
| Pro | 1 GB | 1 |
| Team | 4 GB | 2 |
| Enterprise | Custom | Custom |

### How much traffic can Kubidu handle?

Kubidu can handle millions of requests per day. With auto-scaling:
- Scale to 100+ instances
- Built-in DDoS protection
- Global CDN available

---

## Database & Storage

### Does Kubidu provide databases?

Currently, we recommend:
- **PostgreSQL**: Neon, Supabase, Railway
- **MySQL**: PlanetScale
- **MongoDB**: MongoDB Atlas
- **Redis**: Upstash, Redis Cloud

We're working on managed databases — stay tuned!

### Can I use persistent storage?

For files that need to persist:
- Use object storage (S3-compatible)
- Mount volumes (Team+ plans)

```json
{
  "volumes": [
    {
      "path": "/data",
      "size": "10Gi"
    }
  ]
}
```

---

## Security

### How is my data protected?

- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Isolated containers
- Regular security audits

See [Data Security](/compliance/data-security).

### Do you have SOC 2?

Yes, we're SOC 2 Type II certified. Contact sales for the report.

### Can I use SSO?

SSO is available on Team and Enterprise plans:
- SAML 2.0
- OpenID Connect
- Google Workspace
- Microsoft Entra ID

### How do I report a security issue?

Email security@kubidu.io with:
- Description of the issue
- Steps to reproduce
- Potential impact

We'll respond within 24 hours.

---

## Billing

### Is there a free tier?

Yes! The Free plan includes:
- 3 apps
- 100 deployments/month
- 512 MB RAM
- Forever free

See [Pricing](/billing/plans).

### How does billing work?

- Plans are billed monthly or annually
- Usage charges are calculated monthly
- Pay with card, SEPA, or bank transfer

### Can I pay annually?

Yes, save 20% with annual billing:

```bash
kubidu billing upgrade pro --annual
```

### Do you offer startup credits?

Yes! Eligible startups get €5,000 in credits. Apply at [kubidu.io/startups](https://kubidu.io/startups).

---

## Team & Collaboration

### How do I invite team members?

```bash
kubidu members invite alice@example.com
```

### What roles are available?

| Role | Description |
|------|-------------|
| Viewer | Read-only access |
| Developer | Deploy and manage apps |
| Admin | Full access + team management |
| Owner | Everything + billing |

See [Permissions](/teams/permissions).

### Can I have multiple workspaces?

Yes! Workspaces help you organize:
- By team
- By environment (production, staging)
- By project

See [Workspaces](/teams/workspaces).

---

## CLI

### How do I install the CLI?

```bash
npm install -g @kubidu/cli
```

Or use Homebrew:

```bash
brew install kubidu/tap/kubidu
```

### I get "command not found"

Make sure npm's global bin is in your PATH:

```bash
export PATH="$PATH:$(npm bin -g)"
```

### How do I update the CLI?

```bash
npm update -g @kubidu/cli
```

---

## Getting Help

### Where can I get support?

| Channel | Best For |
|---------|----------|
| [Docs](https://docs.kubidu.io) | Self-service help |
| [Community Discord](https://discord.gg/kubidu) | Community help |
| Email (support@kubidu.io) | Pro+ plans |
| Priority support | Team+ plans |

### How do I report a bug?

- GitHub: [github.com/kubidu/kubidu/issues](https://github.com/kubidu/kubidu/issues)
- Email: support@kubidu.io

### Can I request a feature?

Yes! Submit feature requests:
- GitHub Discussions
- Discord #feature-requests channel
- Email: feedback@kubidu.io
