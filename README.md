# Kubidu - GDPR & ISO 27001 Compliant PaaS Platform

A feature-complete Platform-as-a-Service (PaaS) similar to Railway.com and Heroku, with built-in GDPR and ISO 27001 compliance features.

## Features

- **Multi-User Deployment**: Each user can deploy multiple Docker images with isolated namespaces
- **GitHub Integration**: Automatic deployments triggered by GitHub webhooks
- **Environment Variables**: Encrypted storage with AES-256-GCM
- **Custom Domains**: SSL certificates via Let's Encrypt
- **Resource Management**: CPU/memory limits and quotas per user
- **Billing**: Stripe integration with usage-based pricing
- **CLI Tool**: Command-line interface for deployment management
- **GDPR Compliant**: Data export and deletion on request
- **ISO 27001**: Comprehensive audit logging
- **Real-time Logs**: Stream deployment logs via WebSocket
- **Kubernetes**: Built on k3s for container orchestration

## Architecture

### Services

- **API Service** - Main REST API (NestJS)
- **Webhook Service** - GitHub/GitLab webhook handler
- **Build Service** - Docker image builder
- **Deploy Controller** - Kubernetes orchestration
- **Billing Service** - Stripe integration and usage tracking
- **Audit Service** - Compliance logging
- **Web Dashboard** - React frontend
- **CLI Tool** - Command-line interface

### Infrastructure

- **PostgreSQL** - Primary database
- **Redis** - Queue and cache
- **MinIO** - S3-compatible object storage
- **Docker Registry** - Container image storage
- **k3s** - Lightweight Kubernetes
- **Traefik** - Ingress controller with automatic SSL

## Quick Start

### Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Node.js 18+ (for local development)
- kubectl (optional, for cluster management)
- 8GB+ RAM recommended

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/kubidu.git
cd kubidu
```

2. **Run setup script**

```bash
chmod +x scripts/*.sh
bash scripts/setup.sh
```

This will:
- Create necessary directories
- Generate encryption keys
- Create `.env` file
- Pull Docker images
- Start infrastructure services
- Configure Kubernetes cluster

3. **Install dependencies**

```bash
npm install
```

4. **Build packages**

```bash
npm run build
```

5. **Start all services**

```bash
docker-compose up
```

Or run in detached mode:

```bash
npm run dev:detached
```

### Access Points

Once all services are running:

- **Web Dashboard**: http://localhost:5173
- **API**: http://localhost:3000
- **MinIO Console**: http://localhost:9001
- **PostgreSQL**: localhost:5432
- **Kubernetes API**: localhost:6443

### Default Credentials

For local development, a demo user is created:

- **Email**: `demo@kubidu.io`
- **Password**: `password123`

## Project Structure

```
kubidu/
├── packages/
│   ├── api/                    # Main REST API (NestJS)
│   ├── webhook-service/        # GitHub webhook handler
│   ├── build-service/          # Docker image builder
│   ├── deploy-controller/      # Kubernetes orchestrator
│   ├── billing-service/        # Stripe integration
│   ├── audit-service/          # Audit logging
│   ├── web/                    # React dashboard
│   ├── cli/                    # CLI tool
│   └── shared/                 # Shared types & utilities
├── infrastructure/
│   ├── docker/                 # Dockerfiles
│   ├── kubernetes/             # K8s manifests
│   └── nginx/                  # Reverse proxy config
├── scripts/                    # Setup & utility scripts
├── docker-compose.yml          # Development environment
└── package.json                # Monorepo root
```

## Development

### Running Individual Services

```bash
# API Service
cd packages/api && npm run dev

# Web Dashboard
cd packages/web && npm run dev

# Webhook Service
cd packages/webhook-service && npm run dev
```

### Database Migrations

```bash
# Run migrations
npm run db:migrate

# Reset database (WARNING: destroys all data)
docker-compose down -v
docker-compose up -d postgres
npm run db:migrate
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api

# Kubernetes cluster
kubectl logs -f <pod-name>
```

### Testing

```bash
# Run all tests
npm test

# Run tests for specific package
npm test --workspace=packages/api

# Run with coverage
npm test -- --coverage
```

## CLI Usage

After installing the CLI globally:

```bash
npm install -g packages/cli

# Login
kubidu login

# Create a project
kubidu projects:create my-app --repo https://github.com/user/repo

# Deploy
kubidu deploy

# View logs
kubidu logs

# Set environment variables
kubidu env:set API_KEY=secret123

# List deployments
kubidu ps

# Scale deployment
kubidu ps:scale my-deployment 3
```

## Configuration

### Environment Variables

Key environment variables in `.env`:

```bash
# Database
DATABASE_URL=postgresql://kubidu:password@postgres:5432/kubidu

# Security (IMPORTANT: Change in production!)
JWT_SECRET=<generated-automatically>
ENCRYPTION_KEY=<generated-automatically>

# GitHub
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# Stripe (optional for development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Subscription Plans

Configured in `packages/shared/src/constants/index.ts`:

- **Free**: 2 projects, 100 build minutes/month
- **Starter**: $29/month, 10 projects, 500 build minutes
- **Pro**: $99/month, 50 projects, 2000 build minutes
- **Enterprise**: Custom pricing, unlimited

## Kubernetes Management

### Accessing the Cluster

```bash
export KUBECONFIG=$(pwd)/kubeconfig/kubeconfig.yaml
kubectl get nodes
```

### User Namespaces

Each user gets a dedicated namespace with resource quotas:

```bash
# List all user namespaces
kubectl get namespaces -l kubidu.io/managed-by=kubidu-platform

# View quota for a user
kubectl get resourcequota -n user-<user-id>

# View deployments for a user
kubectl get deployments -n user-<user-id>
```

### Debugging Deployments

```bash
# Get deployment status
kubectl get deployment -n user-<user-id> deployment-<deployment-id>

# View logs
kubectl logs -n user-<user-id> -l kubidu.io/deployment-id=<deployment-id>

# Describe pod issues
kubectl describe pod -n user-<user-id> <pod-name>
```

## Security

### Best Practices

1. **Change default secrets** in `.env` before deploying to production
2. **Use strong passwords** for all services
3. **Enable 2FA** for user accounts
4. **Rotate encryption keys** regularly
5. **Keep Docker images updated**
6. **Review audit logs** periodically
7. **Backup database** regularly

### Compliance Features

#### GDPR

- **Data Export**: Users can request a complete export of their data
- **Data Deletion**: Users can request account deletion (14-day grace period)
- **Consent Tracking**: All user consents are logged with version and timestamp
- **Privacy by Design**: Minimal data collection, encrypted storage

#### ISO 27001

- **Audit Logging**: All state-changing operations are logged
- **Access Control**: Role-based permissions (RBAC)
- **Encryption**: Data encrypted at rest and in transit
- **Incident Response**: Automated alerts for security events

## Monitoring

### Prometheus Metrics

If Prometheus is enabled, metrics are available at:

- API: `http://localhost:3000/metrics`
- Kubernetes: `http://localhost:9090`

### Health Checks

Each service exposes a health endpoint:

```bash
curl http://localhost:3000/health
```

## Troubleshooting

### Services won't start

```bash
# Check Docker resources
docker system df

# Check service logs
docker-compose logs <service-name>

# Restart services
docker-compose restart
```

### Database connection issues

```bash
# Ensure PostgreSQL is healthy
docker-compose ps postgres

# Check connection
docker-compose exec postgres psql -U kubidu -d kubidu
```

### Kubernetes not responding

```bash
# Restart k3s
docker-compose restart k3s

# Check kubeconfig
export KUBECONFIG=$(pwd)/kubeconfig/kubeconfig.yaml
kubectl get nodes
```

### Build failures

```bash
# Check build service logs
docker-compose logs build-service

# Check Docker socket permissions
ls -la /var/run/docker.sock

# Ensure Docker has enough resources
docker system prune -a
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

- **Documentation**: [docs.kubidu.io](https://docs.kubidu.io) (coming soon)
- **Issues**: [GitHub Issues](https://github.com/yourusername/kubidu/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/kubidu/discussions)

## Roadmap

- [x] Core deployment pipeline
- [x] GitHub integration
- [x] Basic billing
- [x] GDPR compliance features
- [ ] GitLab/Bitbucket support
- [ ] Horizontal autoscaling
- [ ] Database backups
- [ ] Monitoring dashboards
- [ ] Email notifications
- [ ] Marketplace for add-ons
- [ ] Multi-region support
- [ ] Enterprise SSO

---

Built with ❤️ for developers who need compliance without complexity
