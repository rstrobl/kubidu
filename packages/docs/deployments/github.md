# GitHub Integration

Connect your GitHub repository to Kubidu for automatic deployments on every push.

## Setting Up

### 1. Link Your Repository

```bash
kubidu link github
```

This opens a browser to authorize Kubidu. Select the repositories you want to connect.

### 2. Configure Auto-Deploy

Choose which branches trigger deployments:

```json
{
  "github": {
    "autoDeploy": true,
    "branches": ["main", "production"]
  }
}
```

### 3. That's It!

Every push to `main` now triggers a deployment automatically.

## How It Works

```
┌──────────┐     ┌───────────┐     ┌──────────┐
│  Push    │ →   │  Webhook  │ →   │  Deploy  │
│  to Git  │     │  Received │     │  Started │
└──────────┘     └───────────┘     └──────────┘
```

1. You push code to GitHub
2. GitHub sends a webhook to Kubidu
3. Kubidu pulls your code and starts a build
4. New version goes live automatically

## Branch Deployments

### Production Branch

By default, the `main` branch deploys to your primary URL:

```
main → https://my-app.kubidu.io
```

### Preview Branches

Enable preview deployments for pull requests:

```json
{
  "github": {
    "previewBranches": true
  }
}
```

Each PR gets its own URL:

```
PR #42 → https://my-app-pr-42.kubidu.io
```

Preview deployments are automatically deleted when the PR is closed.

## GitHub Actions

Already using GitHub Actions? Use our action:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Kubidu

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Kubidu
        uses: kubidu/deploy-action@v1
        with:
          token: ${{ secrets.KUBIDU_TOKEN }}
```

### Advanced Workflow

```yaml
name: Deploy to Kubidu

on:
  push:
    branches: [main, staging]
  pull_request:
    types: [opened, synchronize]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Determine environment
        id: env
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            echo "environment=production" >> $GITHUB_OUTPUT
          elif [ "${{ github.ref }}" = "refs/heads/staging" ]; then
            echo "environment=staging" >> $GITHUB_OUTPUT
          else
            echo "environment=preview" >> $GITHUB_OUTPUT
          fi
      
      - name: Deploy to Kubidu
        uses: kubidu/deploy-action@v1
        with:
          token: ${{ secrets.KUBIDU_TOKEN }}
          environment: ${{ steps.env.outputs.environment }}
```

## Commit Status Checks

Kubidu reports deployment status back to GitHub:

| Status | Description |
|--------|-------------|
| ⏳ Pending | Deployment started |
| ✅ Success | Deployment live |
| ❌ Failure | Deployment failed |

Enable required status checks in your repository settings to prevent merging broken code.

## Environment Variables per Branch

Set different environment variables for different branches:

::: code-group

```json [kubidu.json]
{
  "environments": {
    "production": {
      "branch": "main",
      "env": {
        "NODE_ENV": "production",
        "API_URL": "https://api.example.com"
      }
    },
    "staging": {
      "branch": "staging",
      "env": {
        "NODE_ENV": "staging",
        "API_URL": "https://staging-api.example.com"
      }
    }
  }
}
```

:::

## Monorepo Support

Deploying from a monorepo? Specify the app directory:

```json
{
  "github": {
    "autoDeploy": true,
    "rootDirectory": "apps/web"
  }
}
```

Kubidu only triggers deployments when files in that directory change.

## GitHub Enterprise

Using GitHub Enterprise? Configure the API URL:

```bash
kubidu link github --api-url https://github.mycompany.com/api/v3
```

## Permissions Required

Kubidu requires these GitHub permissions:

| Permission | Reason |
|------------|--------|
| Read code | Pull your repository |
| Read metadata | Get branch/commit info |
| Write commit status | Report deploy status |
| Read pull requests | Create preview deployments |
| Webhooks | Trigger auto-deployments |

## Unlinking

To disconnect a repository:

```bash
kubidu unlink github
```

Or remove access in GitHub: Settings → Applications → Kubidu → Configure.

## Troubleshooting

### Deployments not triggering

1. Check the webhook is active in GitHub: Settings → Webhooks
2. Verify the branch is in your `branches` list
3. Check `kubidu logs --webhook` for errors

### "Repository not found"

Make sure Kubidu has access to the repository:
1. Go to GitHub → Settings → Applications → Kubidu
2. Click "Configure"
3. Add the repository to the allowed list

### Slow deployments

If deployments are taking too long:
1. Check your `.dockerignore` includes `node_modules`, `.git`
2. Use multi-stage Docker builds
3. Enable caching in your Dockerfile
