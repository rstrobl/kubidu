# Scaling

Scale your services to handle more traffic.

## Manual Scaling

### Scale Replicas

```bash
# Scale to 3 replicas
kubidu ps:scale 3

# Scale to 0 (stop service)
kubidu ps:scale 0

# Scale specific service
kubidu ps:scale 3 --service api
```

### View Current Scale

```bash
kubidu ps

# SERVICE  STATUS   REPLICAS  PORT   UPDATED
# ────────────────────────────────────────────
# web      running  3         3000   2m ago
# api      running  2         8080   5m ago
```

## Auto-Scaling

### Enable Auto-Scaling

```yaml
# kubidu.yaml
scaling:
  auto: true
  min: 1
  max: 10
  target_cpu: 70          # Scale up when CPU > 70%
  target_memory: 80       # Scale up when memory > 80%
  target_requests: 1000   # Scale up at 1000 req/min per replica
```

### Via CLI

```bash
kubidu autoscale enable --min 1 --max 10 --cpu 70
```

### Auto-Scale Metrics

Kubidu can scale based on:

| Metric | Description | Example |
|--------|-------------|---------|
| CPU | CPU utilization | `target_cpu: 70` |
| Memory | Memory utilization | `target_memory: 80` |
| Requests | Requests per minute | `target_requests: 1000` |
| Queue | Queue depth (Redis/SQS) | `target_queue: 100` |
| Custom | Custom Prometheus metric | `custom_metric: my_metric` |

### Scale-Up Behavior

```yaml
scaling:
  auto: true
  min: 1
  max: 10
  target_cpu: 70
  
  scale_up:
    cooldown: 30       # Wait 30s between scale-ups
    step: 2            # Add 2 replicas at a time
    
  scale_down:
    cooldown: 300      # Wait 5min before scaling down
    step: 1            # Remove 1 replica at a time
```

## Resource Limits

### Per-Replica Resources

```yaml
# kubidu.yaml
resources:
  cpu: 500m           # 0.5 CPU cores
  memory: 512Mi       # 512 MB RAM
  
  # Limits (max)
  limits:
    cpu: 1000m        # 1 CPU core max
    memory: 1Gi       # 1 GB RAM max
```

### Resource Tiers

| Tier | CPU | Memory | Price/hour |
|------|-----|--------|------------|
| Hobby | 100m | 256Mi | $0.00 |
| Basic | 500m | 512Mi | $0.05 |
| Standard | 1000m | 1Gi | $0.10 |
| Performance | 2000m | 4Gi | $0.40 |
| Enterprise | 4000m | 8Gi | $0.80 |

### Change Resources

```bash
# Via CLI
kubidu resources set --cpu 1000m --memory 1Gi

# Requires redeployment
kubidu deploy
```

## Load Balancing

### Round Robin (Default)

Requests distributed evenly:

```yaml
loadbalancing:
  algorithm: round-robin
```

### Least Connections

Route to least busy replica:

```yaml
loadbalancing:
  algorithm: least-connections
```

### IP Hash

Sticky sessions by client IP:

```yaml
loadbalancing:
  algorithm: ip-hash
```

### Cookie-Based Sessions

Sticky sessions via cookie:

```yaml
loadbalancing:
  algorithm: cookie
  cookie_name: KUBIDU_SESSION
  cookie_ttl: 3600
```

## Regional Scaling

### Multi-Region Deployment

```yaml
# kubidu.yaml
regions:
  primary: eu-central-1
  replicas:
    - us-east-1
    - ap-southeast-1
    
scaling:
  per_region:
    eu-central-1:
      min: 2
      max: 10
    us-east-1:
      min: 1
      max: 5
```

### Geo Routing

Automatically route users to nearest region:

```yaml
routing:
  geo: true
  fallback: eu-central-1
```

## Worker Scaling

For background workers (no HTTP):

```yaml
# kubidu.yaml
service: worker

type: worker           # Not web
scaling:
  auto: true
  min: 1
  max: 20
  
  # Scale based on queue depth
  metrics:
    - type: queue
      queue_name: jobs
      target: 100      # Scale up when >100 jobs pending
```

## Zero-Downtime Scaling

Kubidu ensures zero downtime when scaling:

1. New replicas start
2. Health checks pass
3. Traffic routed to new replicas
4. Old replicas drained
5. Old replicas terminated

### Graceful Shutdown

Configure graceful shutdown:

```yaml
deploy:
  shutdown_grace_period: 30   # Seconds to drain connections
```

In your app:

```javascript
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

## Scaling Limits

| Plan | Max Replicas | Max CPU/Replica | Max Memory/Replica |
|------|--------------|-----------------|-------------------|
| Free | 1 | 100m | 256Mi |
| Hobby | 3 | 500m | 512Mi |
| Pro | 20 | 2000m | 4Gi |
| Enterprise | Unlimited | Unlimited | Unlimited |

## Monitoring Scale

### View Metrics

```bash
# Current utilization
kubidu status --watch

# CPU and memory graphs in dashboard
kubidu open --dashboard
```

### Scaling Events

```bash
kubidu events --type scaling

# TIMESTAMP            EVENT                  DETAILS
# ─────────────────────────────────────────────────────
# 2024-01-15 12:30:00  scaled_up              1 → 3 replicas
# 2024-01-15 12:45:00  scaled_down            3 → 2 replicas
```

## Cost Optimization

### Recommendations

```bash
kubidu recommendations

# 💡 Recommendations:
# • web: Scale down to 2 replicas (avg utilization: 15%)
# • api: Increase memory to 1Gi (OOM risk detected)
# • worker: Enable auto-scaling (bursty traffic pattern)
```

### Scheduled Scaling

Scale based on schedule:

```yaml
scaling:
  schedule:
    - cron: "0 9 * * 1-5"    # 9 AM weekdays
      replicas: 5
      
    - cron: "0 18 * * 1-5"   # 6 PM weekdays
      replicas: 2
      
    - cron: "0 0 * * 0,6"    # Weekends
      replicas: 1
```

## Troubleshooting

### Scaling Not Working

1. Check auto-scaling is enabled:
   ```bash
   kubidu autoscale status
   ```

2. Verify metrics are reporting:
   ```bash
   kubidu metrics
   ```

3. Check cooldown period hasn't expired

### Replicas Crashing

1. Check logs: `kubidu logs`
2. Increase memory limits
3. Check health checks

### Slow Scale-Up

1. Reduce health check interval
2. Decrease cooldown period
3. Increase step size

## See Also

- [Deployments](./deployments.md)
- [Resources & Pricing](./pricing.md)
- [Monitoring](./monitoring.md)
