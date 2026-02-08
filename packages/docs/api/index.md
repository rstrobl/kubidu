# API Overview

The Kubidu API lets you programmatically manage deployments, apps, and resources.

## Base URL

```
https://api.kubidu.io/v1
```

## Authentication

All API requests require authentication via Bearer token:

```bash
curl https://api.kubidu.io/v1/apps \
  -H "Authorization: Bearer kbt_your_token_here"
```

See [Authentication](/api/authentication) for details on obtaining tokens.

## Quick Start

### List Your Apps

```bash
curl https://api.kubidu.io/v1/apps \
  -H "Authorization: Bearer $KUBIDU_TOKEN"
```

### Deploy an App

```bash
curl -X POST https://api.kubidu.io/v1/apps/my-app/deployments \
  -H "Authorization: Bearer $KUBIDU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source": {"type": "image", "image": "my-app:v1.2.3"}}'
```

### Get App Status

```bash
curl https://api.kubidu.io/v1/apps/my-app \
  -H "Authorization: Bearer $KUBIDU_TOKEN"
```

## Response Format

All responses are JSON:

```json
{
  "data": {
    "id": "app_abc123",
    "name": "my-app",
    "status": "running"
  },
  "meta": {
    "requestId": "req_xyz789"
  }
}
```

### List Responses

```json
{
  "data": [
    {"id": "app_abc123", "name": "my-app"},
    {"id": "app_def456", "name": "other-app"}
  ],
  "meta": {
    "total": 2,
    "page": 1,
    "perPage": 20
  }
}
```

### Error Responses

```json
{
  "error": {
    "code": "not_found",
    "message": "App not found",
    "details": {
      "appId": "non-existent-app"
    }
  },
  "meta": {
    "requestId": "req_xyz789"
  }
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `204` | No content (successful deletion) |
| `400` | Bad request (invalid parameters) |
| `401` | Unauthorized (invalid/missing token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not found |
| `409` | Conflict (e.g., duplicate name) |
| `422` | Unprocessable entity (validation error) |
| `429` | Rate limited |
| `500` | Server error |

## Pagination

List endpoints support pagination:

```bash
curl "https://api.kubidu.io/v1/apps?page=2&per_page=50" \
  -H "Authorization: Bearer $KUBIDU_TOKEN"
```

| Parameter | Default | Max |
|-----------|---------|-----|
| `page` | 1 | - |
| `per_page` | 20 | 100 |

## Rate Limiting

API requests are rate limited:

| Plan | Requests/minute |
|------|-----------------|
| Free | 60 |
| Pro | 300 |
| Team | 1000 |
| Enterprise | Custom |

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 298
X-RateLimit-Reset: 1705320000
```

## Versioning

The API is versioned via URL path:

```
https://api.kubidu.io/v1/...
```

The current version is `v1`. We'll notify you before any breaking changes.

## SDKs

Official SDKs are available:

::: code-group

```bash [Node.js]
npm install @kubidu/sdk
```

```bash [Python]
pip install kubidu
```

```bash [Go]
go get github.com/kubidu/kubidu-go
```

:::

### Node.js Example

```javascript
import { Kubidu } from '@kubidu/sdk';

const kubidu = new Kubidu({ token: process.env.KUBIDU_TOKEN });

const apps = await kubidu.apps.list();
console.log(apps);

await kubidu.apps.deploy('my-app', {
  source: { type: 'image', image: 'my-app:v1.2.3' }
});
```

### Python Example

```python
from kubidu import Kubidu

kubidu = Kubidu(token=os.environ['KUBIDU_TOKEN'])

apps = kubidu.apps.list()
print(apps)

kubidu.apps.deploy('my-app', source={'type': 'image', 'image': 'my-app:v1.2.3'})
```

## Webhooks

Subscribe to events via webhooks:

```bash
curl -X POST https://api.kubidu.io/v1/webhooks \
  -H "Authorization: Bearer $KUBIDU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://my-server.com/webhook",
    "events": ["deployment.success", "deployment.failed"]
  }'
```

See the [Endpoints Reference](/api/reference) for full webhook documentation.

## Next Steps

- [Authentication](/api/authentication) — How to authenticate
- [API Reference](/api/reference) — Full endpoint documentation
