# Deployments

Learn how to deploy and manage your applications on Kubidu.

## Deployment Methods

### CLI Deploy

The most common way to deploy:

```bash
kubidu deploy
```

This:
1. Creates a tarball of your project
2. Uploads to Kubidu build service
3. Builds a Docker image
4. Deploys to Kubernetes cluster
5. Performs health checks

### Watch Mode

Auto-deploy on file changes:

```bash
kubidu deploy --watch
```

Great for development. Uses `.gitignore` to exclude files.

### Git Integration

Connect your GitHub/GitLab repository for automatic deployments:

1. Go to **Dashboard → Settings → Git**
2. Connect your repository
3. Configure branch triggers

```yaml
# .kubidu/deploy.yaml
trigger:
  branches:
    - main      # Deploy on push to main
    - staging   # Deploy on push to staging
  
production:
  branch: main
  environment: production
  
staging:
  branch: staging
  environment: staging
```

## Deployment Configuration

### kubidu.yaml

```yaml
name: my-app
service: web

build:
  dockerfile: Dockerfile
  context: .
  target: production        # Multi-stage build target
  args:
    NODE_ENV: production    # Build-time arguments
  
deploy:
  replicas: 2               # Number of instances
  port: 3000                # Container port
  healthcheck: /health      # Health endpoint
  healthcheck_interval: 30  # Seconds between checks
  timeout: 120              # Deployment timeout (seconds)
  
resources:
  cpu: 500m                 # CPU limit (millicores)
  memory: 512Mi             # Memory limit
```

### Ignore Files

Create `.kubiduignore` to exclude files from deployment:

```
# .kubiduignore
node_modules/
.git/
*.log
.env.local
tests/
coverage/
```

## Health Checks

Kubidu verifies your app is healthy before routing traffic.

### HTTP Health Check

```yaml
deploy:
  healthcheck: /health
  healthcheck_interval: 10
```

Your endpoint must return `200 OK`:

```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});
```

### Command Health Check

```yaml
deploy:
  healthcheck_command: ["curl", "-f", "http://localhost:3000/health"]
```

## Rollbacks

### Automatic Rollback

If health checks fail, Kubidu automatically rolls back to the previous version.

### Manual Rollback

```bash
# List deployments
kubidu deployments list

# Rollback to specific version
kubidu rollback dep_abc123
```

## Blue-Green Deployments

Kubidu uses blue-green deployments by default:

1. New version deployed alongside old
2. Health checks run on new version
3. Traffic switched to new version
4. Old version terminated

Zero-downtime guaranteed.

## Deployment History

View past deployments:

```bash
# List recent deployments
kubidu deployments list

# View deployment details
kubidu deployments info dep_abc123

# View deployment logs
kubidu logs --deployment dep_abc123
```

## Environment-Specific Deployments

### Using Branches

```bash
# Deploy to staging
git checkout staging
kubidu deploy

# Deploy to production
git checkout main
kubidu deploy
```

### Using Environment Flag

```bash
kubidu deploy --env production
kubidu deploy --env staging
```

## Continuous Deployment

### GitHub Actions

```yaml
name: Deploy to Kubidu

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
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
  stage: deploy
  image: node:18
  script:
    - npm install -g @kubidu/cli
    - kubidu login --token $KUBIDU_TOKEN
    - kubidu deploy
  only:
    - main
```

### CircleCI

```yaml
version: 2.1
jobs:
  deploy:
    docker:
      - image: node:18
    steps:
      - checkout
      - run: npm install -g @kubidu/cli
      - run: kubidu login --token $KUBIDU_TOKEN
      - run: kubidu deploy
```

## Build Caching

Kubidu caches:
- Docker layers
- npm/yarn/pnpm packages
- Go modules
- pip packages

To bust the cache:

```bash
kubidu deploy --no-cache
```

## Build Logs

View build output:

```bash
# Stream build logs
kubidu logs --build

# View specific build
kubidu logs --deployment dep_abc123 --build
```

## Deployment Webhooks

Get notified on deployment events:

1. Go to **Dashboard → Settings → Webhooks**
2. Add webhook URL
3. Select events

Events:
- `deployment.started`
- `deployment.building`
- `deployment.deploying`
- `deployment.success`
- `deployment.failed`

Payload:

```json
{
  "event": "deployment.success",
  "deployment": {
    "id": "dep_abc123",
    "service": "web",
    "status": "success",
    "commit": "abc1234",
    "duration": 45
  },
  "timestamp": "2024-01-15T12:00:00Z"
}
```

## Troubleshooting

### Build Failed

1. Check build logs: `kubidu logs --build`
2. Verify Dockerfile syntax
3. Check for missing dependencies

### Deployment Stuck

1. Check health endpoint returns 200
2. Verify correct port in `kubidu.yaml`
3. Check app starts within timeout

### Slow Deployments

1. Optimize Dockerfile (use multi-stage builds)
2. Reduce image size
3. Use `.kubiduignore` to exclude unnecessary files

See [Troubleshooting](../troubleshooting.md) for more.
