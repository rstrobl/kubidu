# API Authentication

Secure your API access with tokens and OAuth.

## Authentication Methods

| Method | Best For |
|--------|----------|
| API Tokens | Scripts, CI/CD, server-to-server |
| OAuth 2.0 | Web applications, user auth |
| Personal Access Tokens | Development, testing |

## API Tokens

### Creating a Token

#### Via Dashboard

1. Go to [app.kubidu.io/settings/tokens](https://app.kubidu.io/settings/tokens)
2. Click "Create Token"
3. Enter a name and select scopes
4. Copy the token immediately (it won't be shown again)

#### Via CLI

```bash
kubidu tokens create --name my-token --scope apps:read apps:write
```

### Using a Token

Include the token in the `Authorization` header:

```bash
curl https://api.kubidu.io/v1/apps \
  -H "Authorization: Bearer kbt_your_token_here"
```

### Token Format

Tokens are prefixed for easy identification:

| Prefix | Type |
|--------|------|
| `kbt_` | API token |
| `kbr_` | Refresh token |
| `kbs_` | Session token |

### Token Scopes

Control what your token can access:

| Scope | Description |
|-------|-------------|
| `apps:read` | View apps and deployments |
| `apps:write` | Create, deploy, delete apps |
| `env:read` | View environment variables |
| `env:write` | Set environment variables |
| `logs:read` | View logs |
| `members:read` | View team members |
| `members:write` | Invite/remove members |
| `billing:read` | View billing info |

Example: Create a deploy-only token:

```bash
kubidu tokens create --name ci-deploy --scope apps:read apps:write
```

### Listing Tokens

```bash
kubidu tokens list
```

```
NAME          SCOPES                    CREATED       LAST USED
ci-deploy     apps:read, apps:write     30 days ago   2 hours ago
monitoring    logs:read                 60 days ago   5 min ago
```

### Revoking Tokens

```bash
kubidu tokens revoke ci-deploy
```

Revoked tokens are immediately invalidated.

## OAuth 2.0

For applications that act on behalf of users.

### Register Your Application

1. Go to [app.kubidu.io/settings/oauth](https://app.kubidu.io/settings/oauth)
2. Click "Create Application"
3. Enter app name and redirect URIs
4. Save your client ID and secret

### Authorization Flow

#### 1. Redirect to Authorization

```
https://app.kubidu.io/oauth/authorize?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://your-app.com/callback&
  response_type=code&
  scope=apps:read apps:write&
  state=random_state_string
```

#### 2. User Authorizes

User sees a consent screen and approves access.

#### 3. Exchange Code for Token

```bash
curl -X POST https://api.kubidu.io/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "code": "AUTHORIZATION_CODE",
    "redirect_uri": "https://your-app.com/callback"
  }'
```

Response:

```json
{
  "access_token": "kbs_xxx",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "kbr_xxx",
  "scope": "apps:read apps:write"
}
```

#### 4. Use the Access Token

```bash
curl https://api.kubidu.io/v1/apps \
  -H "Authorization: Bearer kbs_xxx"
```

### Refreshing Tokens

Access tokens expire after 1 hour. Use the refresh token:

```bash
curl -X POST https://api.kubidu.io/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "refresh_token": "kbr_xxx"
  }'
```

## Personal Access Tokens

For quick development and testing:

```bash
# Create a personal token (all your permissions)
kubidu tokens create --personal --name dev-token
```

Personal tokens:
- Have all your permissions
- Don't require scope specification
- Are tied to your account

::: warning
Don't use personal tokens in production. Create scoped tokens instead.
:::

## Service Accounts

For production automation, create a service account:

```bash
kubidu service-accounts create github-actions
```

Service accounts:
- Are separate from user accounts
- Have their own permissions
- Show in audit logs as distinct users
- Can be managed by admins

## Best Practices

### 1. Use Minimal Scopes

```bash
# Good: Only what's needed
kubidu tokens create --scope apps:read logs:read

# Avoid: Too broad
kubidu tokens create --scope '*'
```

### 2. Rotate Tokens Regularly

```bash
# Create new token
kubidu tokens create --name ci-deploy-2024-02

# Update your CI/CD
# Then revoke old token
kubidu tokens revoke ci-deploy-2024-01
```

### 3. Use Environment Variables

```bash
# Don't hardcode tokens
export KUBIDU_TOKEN=kbt_xxx

# Use in scripts
curl -H "Authorization: Bearer $KUBIDU_TOKEN" ...
```

### 4. Monitor Token Usage

```bash
kubidu tokens usage ci-deploy
```

Check for unexpected usage patterns.

## Troubleshooting

### "Unauthorized" Error

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Invalid or expired token"
  }
}
```

Solutions:
1. Check the token is correct
2. Verify the token hasn't been revoked
3. For OAuth, refresh the access token

### "Forbidden" Error

```json
{
  "error": {
    "code": "forbidden",
    "message": "Insufficient permissions"
  }
}
```

Solutions:
1. Check token scopes include required permission
2. Verify your account has access to the resource
3. Create a new token with correct scopes

### Token Exposed

If a token is accidentally exposed:

```bash
# Immediately revoke it
kubidu tokens revoke exposed-token

# Check audit log for unauthorized access
kubidu audit-log --token exposed-token

# Create a new token
kubidu tokens create --name new-secure-token
```
