# Logs

View and stream application logs from your services.

## Viewing Logs

### Basic Usage

```bash
# View recent logs
kubidu logs

# View more lines
kubidu logs -n 500
kubidu logs --lines 500
```

### Follow Mode

Stream logs in real-time:

```bash
kubidu logs -f
kubidu logs --follow
```

Press `Ctrl+C` to stop streaming.

### Time-Based Filtering

```bash
# Logs from last hour
kubidu logs --since 1h

# Logs from last 30 minutes
kubidu logs --since 30m

# Logs since specific time
kubidu logs --since "2024-01-15T10:00:00Z"

# Logs between times
kubidu logs --since "2024-01-15T10:00:00Z" --until "2024-01-15T12:00:00Z"
```

### Filter by Level

```bash
# Only errors
kubidu logs --level error

# Warnings and above
kubidu logs --level warn

# Debug and above
kubidu logs --level debug
```

### Filter by Source

```bash
# Specific replica
kubidu logs --source web-abc123

# Build logs
kubidu logs --build

# Deploy logs
kubidu logs --deploy
```

## Log Format

### Default Output

```
12:34:56 INFO  [web-abc123] Server started on port 3000
12:34:57 DEBUG [web-abc123] Connected to database
12:34:58 INFO  [web-abc123] Handling request GET /api/users
12:35:01 ERROR [web-abc123] Database connection failed
```

### JSON Output

```bash
kubidu logs --format json
```

```json
{"timestamp":"2024-01-15T12:34:56Z","level":"info","message":"Server started","source":"web-abc123"}
```

### Raw Output

```bash
kubidu logs --raw
```

## Logging Best Practices

### Structured Logging

```javascript
// Node.js with pino
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

logger.info({ user: userId, action: 'login' }, 'User logged in');
```

```python
# Python with structlog
import structlog
logger = structlog.get_logger()
logger.info("user_login", user_id=user_id, action="login")
```

### Log Levels

| Level | Use Case |
|-------|----------|
| `error` | Errors requiring immediate attention |
| `warn` | Potential issues, degraded functionality |
| `info` | Normal operations, key events |
| `debug` | Detailed diagnostic information |
| `trace` | Very detailed tracing (development only) |

### What to Log

✅ **Do Log:**
- Request/response summaries
- Error details with stack traces
- Authentication events
- Key business operations
- Performance metrics

❌ **Don't Log:**
- Passwords or secrets
- Full credit card numbers
- Personal health information
- Session tokens
- Full request/response bodies

## Log Aggregation

### Export to External Services

```yaml
# kubidu.yaml
logging:
  exports:
    - type: datadog
      api_key: ${DATADOG_API_KEY}
      
    - type: papertrail
      host: logs.papertrailapp.com
      port: 12345
      
    - type: logtail
      source_token: ${LOGTAIL_TOKEN}
```

### Supported Services

- Datadog
- Papertrail
- Logtail
- Logz.io
- Elastic/OpenSearch
- Splunk
- Custom HTTP endpoint

### Custom Webhook

```yaml
logging:
  exports:
    - type: http
      url: https://logs.example.com/ingest
      headers:
        Authorization: Bearer ${LOG_API_KEY}
      format: json
```

## Log Retention

| Plan | Retention |
|------|-----------|
| Free | 1 day |
| Hobby | 7 days |
| Pro | 30 days |
| Enterprise | Custom (up to unlimited) |

### Download Historical Logs

```bash
# Download logs for a time range
kubidu logs download --since 2024-01-01 --until 2024-01-15 --output logs.json
```

## Build Logs

View build-time output:

```bash
# Latest build
kubidu logs --build

# Specific deployment
kubidu logs --deployment dep_abc123 --build
```

Build logs include:
- Docker build output
- Dependency installation
- Compilation/bundling
- Test execution (if configured)

## Deploy Logs

View deployment events:

```bash
kubidu logs --deploy
```

Deploy logs include:
- Container startup
- Health check results
- Traffic routing
- Rollback events

## Log Searching

### Full-Text Search

```bash
# Search for text
kubidu logs --search "error connecting"

# Case insensitive
kubidu logs --search "error" --ignore-case

# Regex
kubidu logs --search "/error.*database/i"
```

### Dashboard Search

1. Go to **Service → Logs**
2. Use search bar for full-text search
3. Click log entries for details
4. Create saved searches

## Alerts

### Log-Based Alerts

```yaml
# kubidu.yaml
alerts:
  - name: error_spike
    condition: count(level=error) > 10
    window: 5m
    notification:
      - type: email
        to: team@example.com
      - type: slack
        webhook: ${SLACK_WEBHOOK}
```

### Common Alert Patterns

```yaml
alerts:
  # Error rate
  - name: high_error_rate
    condition: rate(level=error) > 0.01  # 1% error rate
    
  # Specific error
  - name: database_errors
    condition: count(message contains "database") > 0
    window: 1m
    
  # Response time (from logs)
  - name: slow_responses
    condition: avg(response_time) > 1000
    window: 5m
```

## Metrics from Logs

Kubidu auto-extracts metrics from structured logs:

```javascript
// Log with timing
logger.info({ 
  request_id: id,
  duration_ms: 156,
  status: 200,
  path: '/api/users'
}, 'Request completed');
```

Creates metrics:
- `request_duration_ms` histogram
- `request_status` counter
- `requests_total` counter

## Troubleshooting

### No Logs Appearing

1. Check service is running: `kubidu status`
2. Verify app writes to stdout/stderr
3. Wait a few seconds for log ingestion

### Logs Truncated

1. Increase line limit: `kubidu logs -n 1000`
2. Use time range: `kubidu logs --since 1h`
3. Download for full history: `kubidu logs download`

### Log Latency

Logs typically appear within 2-5 seconds. For real-time needs:
- Use `kubidu logs -f` (WebSocket stream)
- Configure log export to external service

### High Log Volume

1. Reduce log level: `kubidu env set LOG_LEVEL=info`
2. Sample debug logs
3. Use structured logging (smaller payloads)
4. Upgrade plan for higher retention

## See Also

- [Deployments](./deployments.md)
- [Monitoring](./monitoring.md)
- [Troubleshooting](../troubleshooting.md)
