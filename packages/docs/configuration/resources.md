# Resource Limits

Configure CPU and memory allocations for your applications. Right-size your resources for performance and cost efficiency.

## Quick Setup

Set resources via CLI:

```bash
kubidu config set deploy.resources.cpu 1
kubidu config set deploy.resources.memory 1Gi
```

## Configuration

### In kubidu.json

```json
{
  "deploy": {
    "resources": {
      "cpu": "0.5",
      "memory": "512Mi"
    }
  }
}
```

### Resource Units

#### CPU

| Value | Description |
|-------|-------------|
| `0.25` | Quarter vCPU |
| `0.5` | Half vCPU |
| `1` | 1 vCPU |
| `2` | 2 vCPUs |
| `4` | 4 vCPUs |

#### Memory

| Value | Description |
|-------|-------------|
| `256Mi` | 256 MB |
| `512Mi` | 512 MB |
| `1Gi` | 1 GB |
| `2Gi` | 2 GB |
| `4Gi` | 4 GB |
| `8Gi` | 8 GB |

## Available Configurations

### Standard Configurations

| Name | CPU | Memory | Use Case |
|------|-----|--------|----------|
| `xs` | 0.25 | 256Mi | Tiny services, cron jobs |
| `sm` | 0.5 | 512Mi | Small APIs, webhooks |
| `md` | 1 | 1Gi | Standard web apps |
| `lg` | 2 | 2Gi | Heavy workloads |
| `xl` | 4 | 4Gi | Compute-intensive |

Use presets:

```bash
kubidu config set deploy.resources md
```

Or in `kubidu.json`:

```json
{
  "deploy": {
    "resources": "md"
  }
}
```

### Custom Configurations

Mix and match:

```json
{
  "deploy": {
    "resources": {
      "cpu": "1.5",
      "memory": "3Gi"
    }
  }
}
```

## Resource Requests vs Limits

### Requests (Guaranteed)

Resources always available to your container:

```json
{
  "resources": {
    "requests": {
      "cpu": "0.5",
      "memory": "512Mi"
    }
  }
}
```

### Limits (Maximum)

Maximum resources your container can use:

```json
{
  "resources": {
    "requests": {
      "cpu": "0.5",
      "memory": "512Mi"
    },
    "limits": {
      "cpu": "2",
      "memory": "2Gi"
    }
  }
}
```

This allows bursting: your app normally uses 0.5 CPU but can burst to 2 CPU when needed.

### Best Practice

```json
{
  "resources": {
    "requests": {
      "cpu": "0.5",
      "memory": "512Mi"
    },
    "limits": {
      "cpu": "1",
      "memory": "1Gi"
    }
  }
}
```

- Requests = typical usage
- Limits = 2x requests (allows bursting)

## Environment-Specific Resources

Different resources per environment:

```json
{
  "environments": {
    "production": {
      "deploy": {
        "resources": {
          "cpu": "2",
          "memory": "4Gi"
        }
      }
    },
    "staging": {
      "deploy": {
        "resources": {
          "cpu": "0.5",
          "memory": "512Mi"
        }
      }
    }
  }
}
```

## Monitoring Resource Usage

### View Current Usage

```bash
kubidu metrics
```

```
┌──────────────────────────────────────────────────────────┐
│ my-app                                                   │
├──────────────────────────────────────────────────────────┤
│ CPU:          0.3 / 1 vCPU (30%)                         │
│ Memory:       384Mi / 1Gi (37%)                          │
│ Network In:   12 MB/min                                  │
│ Network Out:  45 MB/min                                  │
└──────────────────────────────────────────────────────────┘
```

### Resource History

```bash
kubidu metrics --period 24h
```

### Dashboard

View detailed metrics in the [Dashboard](https://app.kubidu.io):
- CPU usage over time
- Memory usage over time
- Resource alerts
- Optimization recommendations

## Out of Memory (OOM)

If your app exceeds memory limits, it's killed and restarted.

### Detecting OOM

```bash
kubidu events --type oom
```

```
TIME                  EVENT    MEMORY
2024-01-15 10:30:00  OOM      1024Mi exceeded
```

### Preventing OOM

1. **Increase memory limit:**
   ```bash
   kubidu config set deploy.resources.memory 2Gi
   ```

2. **Profile your app:**
   ```bash
   kubidu profile memory --duration 5m
   ```

3. **Add memory alerts:**
   ```bash
   kubidu alerts add --name "High memory" --metric memory --threshold 80
   ```

## CPU Throttling

If your app exceeds CPU limits, it's throttled (slowed down), not killed.

### Detecting Throttling

```bash
kubidu metrics cpu --include-throttling
```

### Addressing Throttling

1. **Increase CPU limit:**
   ```bash
   kubidu config set deploy.resources.cpu 2
   ```

2. **Optimize your code:** Profile to find CPU hotspots

3. **Add more instances:** Distribute load across instances

## GPU Support

For ML workloads, add GPU resources:

```json
{
  "deploy": {
    "resources": {
      "cpu": "4",
      "memory": "16Gi",
      "gpu": {
        "type": "nvidia-t4",
        "count": 1
      }
    }
  }
}
```

Available GPUs:

| Type | Memory | Use Case |
|------|--------|----------|
| `nvidia-t4` | 16 GB | Inference |
| `nvidia-a10g` | 24 GB | Training |
| `nvidia-a100` | 40/80 GB | Large models |

::: tip
GPU instances are available in select regions. Contact support for availability.
:::

## Recommendations

### Right-Sizing

Kubidu provides resource recommendations:

```bash
kubidu recommend resources
```

```
Based on the last 7 days of usage:

Current:  cpu=1, memory=2Gi
Optimal:  cpu=0.5, memory=1Gi

Estimated savings: €15/month (35%)
```

### Common Configurations

| App Type | CPU | Memory |
|----------|-----|--------|
| Static site | 0.25 | 256Mi |
| Simple API | 0.5 | 512Mi |
| Node.js app | 1 | 1Gi |
| Python/Django | 1 | 2Gi |
| Java/Spring | 2 | 4Gi |
| ML inference | 2 + GPU | 8Gi |

## Pricing

Resources affect your bill:

| Resource | Price |
|----------|-------|
| vCPU | €0.05/hour |
| Memory (1 GB) | €0.01/hour |
| GPU (T4) | €0.50/hour |

Example monthly cost (24/7):
- `0.5 CPU + 512Mi` = ~€27/month
- `1 CPU + 1Gi` = ~€43/month
- `2 CPU + 4Gi` = ~€101/month

Use [auto-scaling](/configuration/scaling) to reduce costs during low traffic.
