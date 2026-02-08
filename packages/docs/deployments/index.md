# Deployments

Kubidu supports multiple ways to deploy your applications. Whether you prefer Docker, direct Git integration, or manual uploads, we've got you covered.

## Deployment Methods

### Docker (Recommended)

The most flexible option. Bring your own `Dockerfile` or let Kubidu generate one.

```bash
kubidu deploy
```

[Learn more about Docker deployments →](/deployments/docker)

### GitHub Integration

Connect your repository and deploy automatically on every push.

```bash
kubidu link github
```

[Set up GitHub integration →](/deployments/github)

### GitLab Integration

Works the same way as GitHub:

```bash
kubidu link gitlab
```

### Direct Upload

Upload a pre-built image or static files:

```bash
kubidu deploy --image my-app:latest
```

## Deployment Lifecycle

Every deployment goes through these stages:

```
┌─────────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐
│   Queued    │ →  │ Building │ →  │ Pushing  │ →  │  Live  │
└─────────────┘    └──────────┘    └──────────┘    └────────┘
```

1. **Queued** — Deployment is waiting to start
2. **Building** — Docker image is being built
3. **Pushing** — Image is being uploaded to the registry
4. **Live** — Container is running and serving traffic

## Deployment Status

Check the status of your deployments:

```bash
kubidu status
```

```
┌──────────────────────────────────────────────────────────┐
│ my-app                                                   │
├──────────────────────────────────────────────────────────┤
│ Status:     ● Running                                    │
│ Version:    v23                                          │
│ URL:        https://my-app-abc123.kubidu.io              │
│ Deployed:   2 hours ago                                  │
│ Instances:  2/2 healthy                                  │
└──────────────────────────────────────────────────────────┘
```

## Zero-Downtime Deployments

Kubidu uses rolling deployments by default:

1. New containers start with the updated code
2. Health checks verify the new containers are healthy
3. Traffic gradually shifts to new containers
4. Old containers are gracefully terminated

Your users never experience downtime.

## Deployment Configuration

Configure deployments in `kubidu.json`:

```json
{
  "name": "my-app",
  "type": "docker",
  "build": {
    "dockerfile": "Dockerfile",
    "context": "."
  },
  "deploy": {
    "instances": 2,
    "healthCheck": {
      "path": "/health",
      "interval": 30
    }
  }
}
```

## Build Cache

Kubidu automatically caches Docker layers between builds. This means:

- Faster builds (often 2-3x faster)
- Lower resource usage
- No configuration needed

## Build Arguments

Pass build-time arguments:

```bash
kubidu deploy --build-arg NODE_ENV=production
```

Or in `kubidu.json`:

```json
{
  "build": {
    "args": {
      "NODE_ENV": "production"
    }
  }
}
```

## Deployment History

View past deployments:

```bash
kubidu deployments list
```

```
 #    VERSION   STATUS    DEPLOYED           DURATION
 23   v23       ● Live    10 min ago         45s
 22   v22       ○ Old     2 hours ago        52s
 21   v21       ○ Old     1 day ago          48s
```

## Next Steps

- [Docker deployments](/deployments/docker) — Deep dive into Docker support
- [GitHub integration](/deployments/github) — Automatic deployments from Git
- [Rollbacks](/deployments/rollbacks) — How to roll back to a previous version
- [Logs](/deployments/logs) — View build and runtime logs
