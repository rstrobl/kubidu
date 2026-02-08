# API Reference

Complete endpoint reference for the Kubidu API.

## Apps

### List Apps

```
GET /v1/apps
```

**Query Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `workspace` | string | Filter by workspace |
| `status` | string | Filter by status |

**Response:**

```json
{
  "data": [
    {
      "id": "app_abc123",
      "name": "my-app",
      "status": "running",
      "url": "https://my-app.kubidu.io",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Get App

```
GET /v1/apps/{appId}
```

**Response:**

```json
{
  "data": {
    "id": "app_abc123",
    "name": "my-app",
    "status": "running",
    "url": "https://my-app.kubidu.io",
    "instances": 2,
    "region": "eu-central-1",
    "config": {
      "port": 3000,
      "healthCheck": {
        "path": "/health"
      }
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Create App

```
POST /v1/apps
```

**Body:**

```json
{
  "name": "my-app",
  "workspace": "ws_abc123",
  "config": {
    "port": 3000,
    "instances": 2
  }
}
```

### Update App

```
PATCH /v1/apps/{appId}
```

**Body:**

```json
{
  "config": {
    "instances": 3
  }
}
```

### Delete App

```
DELETE /v1/apps/{appId}
```

---

## Deployments

### List Deployments

```
GET /v1/apps/{appId}/deployments
```

**Response:**

```json
{
  "data": [
    {
      "id": "dep_xyz789",
      "version": "v25",
      "status": "live",
      "createdAt": "2024-01-15T10:30:00Z",
      "duration": 45,
      "message": "Fix login bug"
    }
  ]
}
```

### Create Deployment

```
POST /v1/apps/{appId}/deployments
```

**Body:**

```json
{
  "source": {
    "type": "image",
    "image": "my-app:v1.2.3"
  },
  "message": "Deploy v1.2.3"
}
```

Or trigger a build:

```json
{
  "source": {
    "type": "git",
    "repo": "https://github.com/org/repo",
    "branch": "main"
  }
}
```

### Get Deployment

```
GET /v1/apps/{appId}/deployments/{deploymentId}
```

### Rollback

```
POST /v1/apps/{appId}/rollback
```

**Body:**

```json
{
  "version": "v23"
}
```

---

## Environment Variables

### List Variables

```
GET /v1/apps/{appId}/env
```

**Response:**

```json
{
  "data": [
    {
      "key": "DATABASE_URL",
      "value": "[REDACTED]",
      "isSecret": true
    },
    {
      "key": "NODE_ENV",
      "value": "production",
      "isSecret": false
    }
  ]
}
```

### Set Variables

```
PUT /v1/apps/{appId}/env
```

**Body:**

```json
{
  "variables": [
    {
      "key": "API_KEY",
      "value": "xxx",
      "isSecret": true
    }
  ]
}
```

### Delete Variable

```
DELETE /v1/apps/{appId}/env/{key}
```

---

## Domains

### List Domains

```
GET /v1/apps/{appId}/domains
```

**Response:**

```json
{
  "data": [
    {
      "domain": "api.example.com",
      "status": "active",
      "ssl": {
        "status": "valid",
        "expiresAt": "2024-06-01T00:00:00Z"
      }
    }
  ]
}
```

### Add Domain

```
POST /v1/apps/{appId}/domains
```

**Body:**

```json
{
  "domain": "api.example.com"
}
```

### Remove Domain

```
DELETE /v1/apps/{appId}/domains/{domain}
```

---

## Logs

### Query Logs

```
GET /v1/apps/{appId}/logs
```

**Query Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `since` | ISO 8601 | Start time |
| `until` | ISO 8601 | End time |
| `level` | string | Log level (debug, info, warn, error) |
| `search` | string | Search term |
| `limit` | number | Max results (default 100) |

**Response:**

```json
{
  "data": [
    {
      "timestamp": "2024-01-15T10:30:00.123Z",
      "level": "info",
      "message": "Server started on port 3000",
      "instance": "my-app-abc123-1"
    }
  ]
}
```

### Stream Logs

```
GET /v1/apps/{appId}/logs/stream
```

Returns Server-Sent Events (SSE):

```
event: log
data: {"timestamp": "2024-01-15T10:30:00.123Z", "level": "info", "message": "..."}

event: log
data: {"timestamp": "2024-01-15T10:30:01.456Z", "level": "info", "message": "..."}
```

---

## Metrics

### Get Metrics

```
GET /v1/apps/{appId}/metrics
```

**Query Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `period` | string | Time period (1h, 24h, 7d, 30d) |
| `metric` | string | Specific metric (cpu, memory, requests) |

**Response:**

```json
{
  "data": {
    "cpu": {
      "current": 0.45,
      "average": 0.38,
      "max": 0.82
    },
    "memory": {
      "current": 384000000,
      "average": 320000000,
      "max": 450000000
    },
    "requests": {
      "total": 125000,
      "perSecond": 45.2,
      "errorRate": 0.001
    }
  }
}
```

---

## Workspaces

### List Workspaces

```
GET /v1/workspaces
```

### Create Workspace

```
POST /v1/workspaces
```

**Body:**

```json
{
  "name": "production"
}
```

### Get Workspace

```
GET /v1/workspaces/{workspaceId}
```

### Delete Workspace

```
DELETE /v1/workspaces/{workspaceId}
```

---

## Members

### List Members

```
GET /v1/workspaces/{workspaceId}/members
```

### Invite Member

```
POST /v1/workspaces/{workspaceId}/members
```

**Body:**

```json
{
  "email": "alice@example.com",
  "role": "developer"
}
```

### Update Member Role

```
PATCH /v1/workspaces/{workspaceId}/members/{userId}
```

**Body:**

```json
{
  "role": "admin"
}
```

### Remove Member

```
DELETE /v1/workspaces/{workspaceId}/members/{userId}
```

---

## Webhooks

### List Webhooks

```
GET /v1/webhooks
```

### Create Webhook

```
POST /v1/webhooks
```

**Body:**

```json
{
  "url": "https://your-server.com/webhook",
  "events": ["deployment.success", "deployment.failed"],
  "workspace": "ws_abc123"
}
```

**Available Events:**
- `deployment.started`
- `deployment.success`
- `deployment.failed`
- `deployment.rollback`
- `app.created`
- `app.deleted`
- `member.invited`
- `member.removed`

### Webhook Payload

```json
{
  "event": "deployment.success",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "app": {
      "id": "app_abc123",
      "name": "my-app"
    },
    "deployment": {
      "id": "dep_xyz789",
      "version": "v25"
    }
  }
}
```

### Delete Webhook

```
DELETE /v1/webhooks/{webhookId}
```

---

## Audit Log

### Query Audit Log

```
GET /v1/audit-log
```

**Query Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `workspace` | string | Filter by workspace |
| `user` | string | Filter by user |
| `action` | string | Filter by action |
| `since` | ISO 8601 | Start time |
| `until` | ISO 8601 | End time |

**Response:**

```json
{
  "data": [
    {
      "id": "log_abc123",
      "timestamp": "2024-01-15T10:30:00Z",
      "user": {
        "id": "usr_xyz",
        "email": "alice@example.com"
      },
      "action": "deployment.create",
      "resource": {
        "type": "app",
        "id": "app_abc123"
      },
      "metadata": {
        "version": "v25"
      }
    }
  ]
}
```
