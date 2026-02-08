# Auto-Scaling

Kubidu automatically scales your app based on traffic, CPU, or memory usage. Handle traffic spikes without manual intervention.

## How It Works

```
Low Traffic          High Traffic          Peak Traffic
    │                     │                     │
    ▼                     ▼                     ▼
┌───────┐            ┌───────┐┌───────┐    ┌───────┐┌───────┐┌───────┐
│  App  │     →      │  App  ││  App  │ →  │  App  ││  App  ││  App  │
└───────┘            └───────┘└───────┘    └───────┘└───────┘└───────┘
1 instance           2 instances           3 instances
```

Kubidu monitors your app and adjusts the number of instances automatically.

## Quick Setup

Enable auto-scaling with sensible defaults:

```bash
kubidu scale auto --min 1 --max 10
```

## Configuration

### Via kubidu.json

```json
{
  "deploy": {
    "scaling": {
      "min": 1,
      "max": 10,
      "metric": "cpu",
      "target": 70
    }
  }
}
```

### Scaling Options

| Option | Description | Default |
|--------|-------------|---------|
| `min` | Minimum instances | 1 |
| `max` | Maximum instances | 10 |
| `metric` | What to scale on | `cpu` |
| `target` | Target percentage | 70 |

## Scaling Metrics

### CPU-Based (Default)

Scale based on CPU usage:

```json
{
  "scaling": {
    "metric": "cpu",
    "target": 70
  }
}
```

When average CPU across instances exceeds 70%, scale up. When it drops below, scale down.

### Memory-Based

Scale based on memory usage:

```json
{
  "scaling": {
    "metric": "memory",
    "target": 80
  }
}
```

### Request-Based

Scale based on requests per second:

```json
{
  "scaling": {
    "metric": "requests",
    "target": 1000
  }
}
```

Scale when each instance handles more than 1000 req/s.

### Concurrent Connections

Scale based on active connections:

```json
{
  "scaling": {
    "metric": "connections",
    "target": 100
  }
}
```

### Custom Metrics

Push custom metrics for scaling decisions:

```javascript
// In your app
const kubidu = require('@kubidu/sdk');

kubidu.metrics.gauge('queue_size', queueLength);
```

```json
{
  "scaling": {
    "metric": "custom:queue_size",
    "target": 50
  }
}
```

## Scaling Behavior

### Scale Up

- Happens quickly (within 30 seconds of threshold breach)
- Can scale multiple instances at once
- Prioritizes availability

### Scale Down

- Happens slowly (5 minute cooldown)
- Scales down one instance at a time
- Waits for traffic to stabilize

### Customize Behavior

```json
{
  "scaling": {
    "min": 2,
    "max": 20,
    "metric": "cpu",
    "target": 70,
    "scaleUpCooldown": 30,
    "scaleDownCooldown": 300,
    "scaleUpStep": 2,
    "scaleDownStep": 1
  }
}
```

## Manual Scaling

### Set Fixed Instance Count

```bash
# Scale to exactly 5 instances
kubidu scale 5
```

### Disable Auto-Scaling

```bash
kubidu scale auto --disable
```

Or in config:

```json
{
  "deploy": {
    "instances": 3,
    "scaling": null
  }
}
```

## Scheduled Scaling

Scale based on time of day:

```json
{
  "scaling": {
    "schedule": [
      {
        "cron": "0 9 * * 1-5",
        "min": 5,
        "max": 20
      },
      {
        "cron": "0 18 * * 1-5",
        "min": 2,
        "max": 10
      },
      {
        "cron": "0 0 * * 6,0",
        "min": 1,
        "max": 5
      }
    ]
  }
}
```

This example:
- 9 AM weekdays: Scale up (5-20 instances)
- 6 PM weekdays: Scale down (2-10 instances)
- Weekends: Minimal (1-5 instances)

## Scale to Zero

For cost savings on rarely-used services:

```json
{
  "scaling": {
    "min": 0,
    "max": 5,
    "scaleToZero": {
      "enabled": true,
      "idleTimeout": 300
    }
  }
}
```

::: warning Cold Starts
When scaled to zero, the first request experiences a cold start delay (typically 2-5 seconds). Not recommended for production APIs.
:::

## Monitoring

### View Current Scale

```bash
kubidu status
```

```
┌──────────────────────────────────────────────────────────┐
│ my-app                                                   │
├──────────────────────────────────────────────────────────┤
│ Instances:    3/10 (auto-scaling)                        │
│ CPU:          45% average                                │
│ Memory:       512MB / 1GB                                │
│ Requests:     1,234/sec                                  │
└──────────────────────────────────────────────────────────┘
```

### Scaling Events

View scaling history:

```bash
kubidu events --type scaling
```

```
TIME                  EVENT           INSTANCES
2024-01-15 10:30:00  scale_up        2 → 3
2024-01-15 10:15:00  scale_up        1 → 2
2024-01-15 09:00:00  scale_down      3 → 1
```

## Alerts

Get notified on scaling events:

```bash
kubidu alerts add \
  --name "Scale up alert" \
  --event scaling.up \
  --notify slack
```

## Best Practices

### 1. Set Appropriate Limits

```json
{
  "scaling": {
    "min": 2,
    "max": 20
  }
}
```

- `min: 2` — Ensures high availability
- `max: 20` — Prevents runaway costs

### 2. Choose the Right Metric

| Use Case | Recommended Metric |
|----------|-------------------|
| CPU-intensive (image processing) | `cpu` |
| Memory-intensive (caching) | `memory` |
| API endpoints | `requests` |
| WebSocket servers | `connections` |

### 3. Test Scaling

Use load testing to verify scaling works:

```bash
# Generate load
kubidu loadtest --duration 5m --rps 500
```

### 4. Set Resource Limits

Auto-scaling works best with proper [resource limits](/configuration/resources):

```json
{
  "deploy": {
    "resources": {
      "cpu": "0.5",
      "memory": "512Mi"
    },
    "scaling": {
      "metric": "cpu",
      "target": 70
    }
  }
}
```

## Pricing

Auto-scaling instances are billed per second:

| Plan | Included Instances | Extra Instance |
|------|-------------------|----------------|
| Free | 1 | - |
| Pro | 3 | €0.02/hour |
| Team | 10 | €0.015/hour |
| Enterprise | Custom | Custom |
