# Logs

View and search your application logs in real-time. Debug issues fast.

## Viewing Logs

### Real-Time Logs

Stream logs as they happen:

```bash
kubidu logs
```

```
2024-01-15T10:23:45.123Z [INFO]  Server started on port 3000
2024-01-15T10:23:46.234Z [INFO]  Connected to database
2024-01-15T10:23:47.345Z [INFO]  GET /api/users 200 45ms
2024-01-15T10:23:48.456Z [WARN]  Rate limit exceeded for IP 1.2.3.4
2024-01-15T10:23:49.567Z [ERROR] Failed to fetch user: timeout
```

### Follow Mode

Keep streaming new logs:

```bash
kubidu logs --follow
```

Press `Ctrl+C` to stop.

### Historical Logs

View logs from a specific time range:

```bash
# Last hour
kubidu logs --since 1h

# Last 24 hours
kubidu logs --since 24h

# Specific time range
kubidu logs --since 2024-01-15T10:00:00 --until 2024-01-15T11:00:00
```

## Filtering Logs

### By Severity

```bash
# Only errors
kubidu logs --level error

# Errors and warnings
kubidu logs --level warn

# Everything (default)
kubidu logs --level debug
```

### By Search Term

```bash
# Find specific text
kubidu logs --search "database connection"

# Regular expression
kubidu logs --search "GET /api/users/\d+"
```

### By Instance

If you have multiple instances:

```bash
# List instances
kubidu instances

# Logs from specific instance
kubidu logs --instance my-app-abc123-1
```

## Build Logs

View logs from the build process:

```bash
kubidu logs --build
```

```
Step 1/8 : FROM node:20-alpine
 ---> a283f62cb84b
Step 2/8 : WORKDIR /app
 ---> Using cache
 ---> 3d7f1c5a8b2e
Step 3/8 : COPY package*.json ./
 ---> 7f2e4a9c1d3b
...
```

### Logs from a Specific Deployment

```bash
kubidu logs --version v23

# Build logs for a specific version
kubidu logs --build --version v23
```

## Dashboard

View logs in the [Kubidu Dashboard](https://app.kubidu.io):

1. Navigate to your app
2. Click "Logs" in the sidebar
3. Use the search bar and filters

Features available in the dashboard:
- Full-text search
- Time range picker
- Log level filters
- Download as file
- Share log links with team

## Structured Logging

For best results, output structured JSON logs:

```javascript
// Instead of
console.log('User logged in: ' + userId);

// Use structured logging
console.log(JSON.stringify({
  level: 'info',
  message: 'User logged in',
  userId: userId,
  timestamp: new Date().toISOString()
}));
```

Or use a logging library:

::: code-group

```javascript [Pino (Node.js)]
const pino = require('pino');
const logger = pino();

logger.info({ userId: '123' }, 'User logged in');
```

```python [structlog (Python)]
import structlog

logger = structlog.get_logger()
logger.info("user_logged_in", user_id="123")
```

```go [zap (Go)]
import "go.uber.org/zap"

logger, _ := zap.NewProduction()
logger.Info("user logged in", zap.String("userId", "123"))
```

:::

## Log Retention

| Plan | Retention |
|------|-----------|
| Free | 24 hours |
| Pro | 7 days |
| Team | 30 days |
| Enterprise | 90 days |

Need longer retention? Export logs to external storage.

## Log Export

### Export to File

```bash
kubidu logs --since 24h --output logs.txt
```

### Export to External Services

Send logs to your observability stack:

```bash
# Datadog
kubidu logs export datadog --api-key YOUR_API_KEY

# Papertrail
kubidu logs export papertrail --destination logs.papertrailapp.com:12345

# Custom HTTP endpoint
kubidu logs export http --url https://your-logging-service.com/ingest
```

Configure in `kubidu.json`:

```json
{
  "logging": {
    "export": {
      "type": "datadog",
      "apiKey": "${DATADOG_API_KEY}"
    }
  }
}
```

## Alerts

Set up alerts for specific log patterns:

```bash
kubidu alerts add \
  --name "Error spike" \
  --query "level:error" \
  --threshold 10 \
  --window 5m \
  --notify slack
```

When more than 10 errors occur in 5 minutes, you'll get a Slack notification.

## Performance

### Log Volume Best Practices

1. **Use appropriate log levels** — Don't log everything as INFO
2. **Avoid logging sensitive data** — No passwords, tokens, or PII
3. **Sample high-volume logs** — Log every Nth request for busy endpoints
4. **Use correlation IDs** — Track requests across services

### Example: Request Logging Middleware

```javascript
const { v4: uuid } = require('uuid');

app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuid();
  
  const start = Date.now();
  
  res.on('finish', () => {
    console.log(JSON.stringify({
      level: 'info',
      type: 'request',
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start
    }));
  });
  
  next();
});
```

## Troubleshooting

### "No logs found"

1. Check your app is actually running: `kubidu status`
2. Verify you're looking at the right app: `kubidu logs --app my-app`
3. Check the time range: `kubidu logs --since 24h`

### Logs are delayed

Logs are streamed in near real-time, but there may be a 1-2 second delay. This is normal.

### Can't find specific logs

Use search with broader terms, then narrow down:

```bash
kubidu logs --search "error" --since 1h
```
