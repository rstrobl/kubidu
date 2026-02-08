# API Reference

REST API reference for Kubidu.

## Base URL

```
https://api.kubidu.dev/v1
```

## Authentication

Include your API token in the Authorization header:

```
Authorization: Bearer kt_your_api_token
```

Get your token from [Dashboard → Settings → API Tokens](https://app.kubidu.dev/settings/tokens).

## Errors

### Error Response Format

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Project not found",
    "details": {
      "projectId": "prj_invalid"
    }
  }
}
```

### Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `BAD_REQUEST` | Invalid request body |
| 401 | `UNAUTHORIZED` | Invalid or missing token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists |
| 422 | `VALIDATION_ERROR` | Invalid input data |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

## Rate Limits

| Tier | Requests/minute |
|------|-----------------|
| Free | 60 |
| Pro | 600 |
| Enterprise | Unlimited |

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 55
X-RateLimit-Reset: 1705312800
```

---

## Projects

### List Projects

```http
GET /projects
```

**Response:**
```json
{
  "data": [
    {
      "id": "prj_abc123",
      "name": "my-app",
      "slug": "my-app",
      "createdAt": "2024-01-15T12:00:00Z",
      "updatedAt": "2024-01-15T12:00:00Z"
    }
  ]
}
```

### Create Project

```http
POST /projects
```

**Request:**
```json
{
  "name": "my-app",
  "description": "My awesome app"
}
```

**Response:**
```json
{
  "id": "prj_abc123",
  "name": "my-app",
  "slug": "my-app",
  "description": "My awesome app",
  "createdAt": "2024-01-15T12:00:00Z"
}
```

### Get Project

```http
GET /projects/{projectId}
```

### Delete Project

```http
DELETE /projects/{projectId}
```

---

## Services

### List Services

```http
GET /projects/{projectId}/services
```

**Response:**
```json
{
  "data": [
    {
      "id": "svc_xyz789",
      "name": "web",
      "projectId": "prj_abc123",
      "status": "running",
      "replicas": 2,
      "port": 3000,
      "createdAt": "2024-01-15T12:00:00Z",
      "updatedAt": "2024-01-15T12:00:00Z"
    }
  ]
}
```

### Create Service

```http
POST /projects/{projectId}/services
```

**Request:**
```json
{
  "name": "web",
  "port": 3000,
  "replicas": 1
}
```

### Get Service

```http
GET /projects/{projectId}/services/{serviceId}
```

### Update Service

```http
PATCH /projects/{projectId}/services/{serviceId}
```

**Request:**
```json
{
  "replicas": 3
}
```

### Delete Service

```http
DELETE /projects/{projectId}/services/{serviceId}
```

---

## Deployments

### Deploy

```http
POST /projects/{projectId}/services/{serviceId}/deploy
Content-Type: multipart/form-data
```

**Form Fields:**
- `archive` - Source code tarball (gzip)

**Response:**
```json
{
  "id": "dep_abc123",
  "status": "pending",
  "createdAt": "2024-01-15T12:00:00Z"
}
```

### Get Deployment

```http
GET /projects/{projectId}/services/{serviceId}/deployments/{deploymentId}
```

**Response:**
```json
{
  "id": "dep_abc123",
  "serviceId": "svc_xyz789",
  "status": "success",
  "commitSha": "abc1234",
  "commitMessage": "Fix bug",
  "createdAt": "2024-01-15T12:00:00Z",
  "finishedAt": "2024-01-15T12:02:00Z"
}
```

### List Deployments

```http
GET /projects/{projectId}/services/{serviceId}/deployments
```

---

## Environment Variables

### List Environment Variables

```http
GET /projects/{projectId}/services/{serviceId}/env
```

**Response:**
```json
{
  "data": [
    {
      "key": "NODE_ENV",
      "value": "production",
      "isSecret": false
    },
    {
      "key": "DATABASE_URL",
      "value": null,
      "isSecret": true
    }
  ]
}
```

Note: Secret values are not returned in API responses.

### Set Environment Variable

```http
POST /projects/{projectId}/services/{serviceId}/env
```

**Request:**
```json
{
  "key": "API_KEY",
  "value": "sk-abc123",
  "isSecret": true
}
```

### Delete Environment Variable

```http
DELETE /projects/{projectId}/services/{serviceId}/env/{key}
```

---

## Domains

### List Domains

```http
GET /projects/{projectId}/services/{serviceId}/domains
```

**Response:**
```json
{
  "data": [
    {
      "id": "dom_abc123",
      "domain": "app.example.com",
      "status": "active",
      "sslStatus": "active",
      "createdAt": "2024-01-15T12:00:00Z"
    }
  ]
}
```

### Add Domain

```http
POST /projects/{projectId}/services/{serviceId}/domains
```

**Request:**
```json
{
  "domain": "app.example.com"
}
```

### Delete Domain

```http
DELETE /projects/{projectId}/services/{serviceId}/domains/{domainId}
```

---

## Logs

### Get Logs

```http
GET /projects/{projectId}/services/{serviceId}/logs
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `lines` | integer | Number of lines (default: 100) |
| `since` | string | ISO 8601 timestamp |
| `until` | string | ISO 8601 timestamp |
| `level` | string | Filter by level |

**Response:**
```json
{
  "data": [
    {
      "timestamp": "2024-01-15T12:00:00Z",
      "level": "info",
      "message": "Server started on port 3000",
      "source": "web-abc123"
    }
  ]
}
```

### Stream Logs (WebSocket)

```
wss://api.kubidu.dev/v1/projects/{projectId}/services/{serviceId}/logs/stream?token={apiToken}
```

Messages are JSON:
```json
{"timestamp":"2024-01-15T12:00:00Z","level":"info","message":"..."}
```

---

## Users

### Get Current User

```http
GET /users/me
```

**Response:**
```json
{
  "id": "usr_abc123",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-15T12:00:00Z"
}
```

---

## Webhooks

### Create Webhook

```http
POST /projects/{projectId}/webhooks
```

**Request:**
```json
{
  "url": "https://example.com/webhook",
  "events": ["deployment.success", "deployment.failed"],
  "secret": "whsec_abc123"
}
```

### Webhook Payload

```json
{
  "event": "deployment.success",
  "timestamp": "2024-01-15T12:00:00Z",
  "data": {
    "deployment": {
      "id": "dep_abc123",
      "status": "success"
    },
    "service": {
      "id": "svc_xyz789",
      "name": "web"
    },
    "project": {
      "id": "prj_abc123",
      "name": "my-app"
    }
  }
}
```

### Verify Webhook Signature

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return `sha256=${expected}` === signature;
}
```

---

## Pagination

List endpoints support pagination:

```http
GET /projects?page=2&limit=20
```

**Response:**
```json
{
  "data": [...],
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

## SDKs

Official SDKs:

- **JavaScript/TypeScript:** `npm install @kubidu/sdk`
- **Python:** `pip install kubidu`
- **Go:** `go get github.com/kubidu/kubidu-go`

### JavaScript Example

```javascript
import { Kubidu } from '@kubidu/sdk';

const kubidu = new Kubidu({ token: 'kt_...' });

const projects = await kubidu.projects.list();
const deployment = await kubidu.deploy('prj_abc123', 'svc_xyz789', './dist');
```
