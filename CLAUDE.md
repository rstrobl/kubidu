# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kubidu is a GDPR & ISO 27001 compliant PaaS platform (similar to Railway/Heroku). It's a TypeScript monorepo using npm workspaces with NestJS backend services, a React frontend, PostgreSQL + Prisma ORM, Redis/Bull queues, and Kubernetes (k3s) for container orchestration.

## Commands

### Development (Docker-based)

```bash
npm run dev                # docker-compose up (all services)
npm run dev:detached       # docker-compose up -d
npm run down               # docker-compose down
npm run down:volumes       # docker-compose down -v (destroys data)
```

### Build / Lint / Test

```bash
npm run build              # Build all packages
npm run lint               # Lint all packages
npm test                   # Test all packages
npm test --workspace=packages/api              # Test single package
npm test --workspace=packages/api -- --coverage # With coverage
```

### Individual service dev (outside Docker)

```bash
cd packages/api && npm run dev       # API with hot reload (port 3000)
cd packages/web && npm run dev       # React dashboard (port 5173)
cd packages/webhook-service && npm run dev
cd packages/build-service && npm run dev
cd packages/deploy-controller && npm run dev
```

### Database (Prisma)

The Prisma schema lives at `packages/api/prisma/schema.prisma`. All backend services share it.

```bash
npx prisma migrate dev --name <name>   # Create + apply migration (from packages/api)
npx prisma generate                     # Regenerate client after schema changes
npm run db:migrate                      # Run migrations via setup script
```

### Setup

```bash
npm run setup              # Full initial setup (dirs, keys, .env, Docker images, k3s)
npm run generate:keys      # Generate encryption keys only
```

## Architecture

### Service topology

```
Nginx (:8080) → routes to:
├── Web (React/Vite :5173) — SPA dashboard
├── API (NestJS :3000) — main REST API, auth, CRUD, WebSocket logs
├── Webhook Service (NestJS :3001) — receives GitHub/GitLab push events
├── Build Service (no port) — Bull queue consumer, builds Docker images
└── Deploy Controller (no port) — Bull queue consumer, manages K8s deployments
```

All backend services connect to the same PostgreSQL database and Redis instance. Async work flows through Bull queues: webhook → build queue → deploy queue.

### Request flow for a deployment

1. GitHub push triggers webhook → Webhook Service validates signature, records event, enqueues build job
2. Build Service picks up job → clones repo, builds Docker image, pushes to private registry (`:5000`)
3. Build Service enqueues deploy job → Deploy Controller picks it up
4. Deploy Controller creates/updates K8s Deployment in user's namespace (`user-<id>`), sets resource limits, configures ingress

### Key packages

- **packages/shared** — `@kubidu/shared` exports TypeScript types, constants (pricing plans, GDPR config), and utilities shared by all services. Must be built before other packages.
- **packages/api** — Central service. Contains Prisma schema, all NestJS modules (auth, projects, services, deployments, environments, domains, audit), JWT + API key auth, AES-256-GCM encryption service.
- **packages/web** — React 18 + Vite + TailwindCSS + Zustand + React Query v5.
- **packages/webhook-service** — Lightweight NestJS service that validates webhook signatures and enqueues build jobs.
- **packages/build-service** — Bull processor that clones git repos, runs `docker build`, pushes images to the private registry.
- **packages/deploy-controller** — Bull processor that talks to the K8s API (via `@kubernetes/client-node`), manages namespaces, deployments, services, and ingress.

### Data model

Prisma schema at `packages/api/prisma/schema.prisma`. Key entity hierarchy:

**User → Project → Service → Deployment**

- **Service** can be `GITHUB` (repo URL + branch) or `DOCKER_IMAGE` (image + tag)
- **EnvironmentVariable** scoped to either Service (inherited by all deployments) or Deployment (override). Values are AES-256-GCM encrypted (`valueEncrypted` + `valueIv`).
- **Domain** belongs to a Service (not a Deployment) — persists across redeploys
- **Deployment** tracks build info (commit SHA, image URL), runtime config (port, replicas, CPU/memory), and status lifecycle: `PENDING → BUILDING → DEPLOYING → RUNNING | FAILED | CRASHED`
- All status fields use Prisma enums for type safety

Database uses `@@map` to snake_case table/column names. All models use UUID primary keys.

### Kubernetes isolation

Each user gets a dedicated namespace `user-<uuid>` with resource quotas. K8s resources are labeled with `kubidu.io/user-id`, `kubidu.io/deployment-id`, etc. The deploy controller creates Deployments, Services (ClusterIP), and Ingress resources per deployment.

### Authentication

JWT-based with short-lived access tokens + refresh tokens. Also supports API key auth for CLI usage. 2FA via Speakeasy (TOTP). Guards: `JwtAuthGuard`, `ApiKeyAuthGuard`.

### TypeScript config

Strict mode enabled with all strict flags (`strictNullChecks`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`). Target ES2020, CommonJS modules. NestJS services use decorators (`experimentalDecorators`, `emitDecoratorMetadata`).

## Infrastructure

Docker Compose runs the full stack: PostgreSQL 15, Redis 7, MinIO (S3-compatible), Docker Registry 2, k3s (lightweight K8s), all app services, and Nginx.

Access points in dev:
- Web: http://localhost:5173
- API: http://localhost:3000
- Nginx gateway: http://localhost:8080
- MinIO console: http://localhost:9001
- K8s API: localhost:6443 (kubeconfig at `./kubeconfig/kubeconfig.yaml`)

Billing service and audit service are defined in docker-compose.yml but commented out (not yet implemented).

## Conventions

- NestJS module pattern: each feature is a module in `packages/api/src/modules/` with its own controller, service, DTOs, and guards
- All state-changing API operations are audit-logged (ISO 27001)
- Sensitive data (env vars, API keys, 2FA secrets) encrypted with AES-256-GCM via `EncryptionService`
- GDPR: data export/deletion endpoints with 14-day deletion grace period, consent tracking with versioning
- Subscription plans (Free/Starter/Pro/Enterprise) configured in `packages/shared/src/constants/`
