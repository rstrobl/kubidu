# Rollbacks

Something went wrong? Roll back to a previous deployment in seconds. Zero downtime, zero stress.

## Quick Rollback

Roll back to the previous version:

```bash
kubidu rollback
```

That's it. Your previous deployment is now live.

## Rollback to a Specific Version

View your deployment history:

```bash
kubidu deployments list
```

```
 #    VERSION   STATUS    DEPLOYED           DURATION
 25   v25       ● Live    5 min ago          45s
 24   v24       ○ Old     2 hours ago        52s
 23   v23       ○ Old     1 day ago          48s
 22   v22       ○ Old     2 days ago         51s
```

Roll back to a specific version:

```bash
kubidu rollback --version v23
```

## How Rollbacks Work

Rollbacks are instant because Kubidu keeps your previous container images ready:

```
┌─────────────┐     ┌─────────────┐
│ Current: v25│     │ Current: v23│
│ Rollback to │ →   │ (instant!)  │
│     v23     │     │             │
└─────────────┘     └─────────────┘
```

1. **No rebuild** — Previous images are cached
2. **No redeployment** — Just a container swap
3. **Zero downtime** — Traffic shifts gracefully

## Rollback in Dashboard

1. Go to your app in the [Dashboard](https://app.kubidu.io)
2. Click "Deployments" in the sidebar
3. Find the version you want
4. Click "Rollback to this version"

## Automatic Rollbacks

Enable automatic rollbacks when health checks fail:

```json
{
  "deploy": {
    "healthCheck": {
      "path": "/health",
      "retries": 3
    },
    "rollback": {
      "automatic": true
    }
  }
}
```

If the new deployment fails health checks 3 times, Kubidu automatically rolls back to the last healthy version.

## Rollback Retention

By default, Kubidu keeps the last **10 deployments** available for rollback. Configure this:

```json
{
  "deploy": {
    "retention": 20
  }
}
```

Older deployments are automatically cleaned up to save storage.

## Rollback Notifications

Get notified when a rollback happens:

```bash
kubidu notifications add slack --webhook https://hooks.slack.com/...
```

Configure events:

```json
{
  "notifications": {
    "events": ["deploy.success", "deploy.failed", "rollback"]
  }
}
```

## Before Rolling Back

### Check the Logs

See what went wrong:

```bash
kubidu logs --version v25
```

### Compare Versions

Diff two deployments:

```bash
kubidu diff v24 v25
```

```diff
Environment Variables:
+ API_URL=https://api.example.com
- API_URL=https://old-api.example.com

Config:
  instances: 2 → 3
```

## Preventing Bad Deployments

### Health Checks

Ensure your app has proper health checks:

```javascript
app.get('/health', async (req, res) => {
  try {
    await db.ping();
    res.status(200).json({ status: 'healthy' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});
```

### Staging Environment

Deploy to staging first:

```bash
kubidu deploy --environment staging
```

Then promote to production:

```bash
kubidu promote staging --to production
```

### Review Deployments

Require approval for production deployments:

```json
{
  "deploy": {
    "requireApproval": true
  }
}
```

## Rollback Limitations

### Database Migrations

::: warning
Rollbacks don't undo database migrations. If your new version ran migrations, consider:
1. Making migrations backward-compatible
2. Having a rollback migration ready
3. Using feature flags instead of migrations for breaking changes
:::

### Stateful Data

Rollbacks only affect the container. Any data written to:
- Databases
- Object storage
- External services

...will remain unchanged.

## Best Practices

1. **Deploy often** — Small changes are easier to debug and roll back
2. **Use health checks** — Catch issues before they affect users
3. **Test in staging** — Validate changes before production
4. **Monitor after deploy** — Watch logs and metrics closely
5. **Document rollbacks** — Note why you rolled back for future reference

## CLI Reference

```bash
# Roll back to previous version
kubidu rollback

# Roll back to specific version
kubidu rollback --version v23

# Roll back and skip confirmation
kubidu rollback --yes

# Roll back a specific app
kubidu rollback --app my-app

# Preview what would be rolled back
kubidu rollback --dry-run
```
