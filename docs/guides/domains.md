# Custom Domains

Configure custom domains with automatic SSL for your services.

## Overview

Every Kubidu service gets a default domain:

```
https://<service-id>.kubidu.app
```

You can also add custom domains with free, auto-renewing SSL certificates.

## Adding a Domain

### Via CLI

```bash
kubidu domains add myapp.example.com
```

Output:
```
✔ Domain added: myapp.example.com

Configure your DNS with the following record:

  Type:  CNAME
  Name:  myapp.example.com
  Value: abc123.kubidu.app

SSL certificate will be provisioned automatically once DNS is configured.
```

### Via Dashboard

1. Go to **Service → Domains**
2. Click **Add Domain**
3. Enter your domain
4. Follow DNS instructions

## DNS Configuration

### CNAME Record (Subdomains)

For subdomains like `app.example.com`:

| Type | Name | Value |
|------|------|-------|
| CNAME | app | abc123.kubidu.app |

### A Record (Root Domain)

For root domains like `example.com`:

| Type | Name | Value |
|------|------|-------|
| A | @ | 95.217.xxx.xxx |

> Get the IP from your dashboard or CLI: `kubidu domains info`

### Common DNS Providers

#### Cloudflare

1. Go to DNS settings
2. Add CNAME record
3. **Disable proxy** (orange cloud → gray cloud)

#### GoDaddy

1. Go to DNS Management
2. Add CNAME or A record
3. Save changes

#### Namecheap

1. Go to Advanced DNS
2. Add new record
3. Save all changes

#### AWS Route 53

```
myapp.example.com.  CNAME  abc123.kubidu.app.
```

## SSL Certificates

### Automatic SSL

Kubidu automatically:
1. Provisions Let's Encrypt certificate
2. Configures HTTPS
3. Redirects HTTP → HTTPS
4. Renews before expiry

### SSL Status

```bash
kubidu domains list

# DOMAIN               STATUS   SSL
# ──────────────────────────────────
# myapp.example.com    active   active
# api.example.com      pending  pending
```

### Troubleshooting SSL

If SSL shows "pending":

1. Verify DNS is configured correctly:
   ```bash
   kubidu domains check myapp.example.com
   ```

2. Wait for DNS propagation (up to 48 hours)

3. Check for CAA records blocking Let's Encrypt:
   ```bash
   dig CAA example.com
   ```

## Wildcard Domains

Support for wildcard domains:

```bash
kubidu domains add "*.example.com"
```

Requires DNS verification via TXT record.

## Multiple Domains

Add multiple domains to one service:

```bash
kubidu domains add app.example.com
kubidu domains add www.example.com
kubidu domains add example.com
```

### Redirect Configuration

```yaml
# kubidu.yaml
domains:
  primary: app.example.com
  redirects:
    - www.example.com → app.example.com
    - example.com → app.example.com
```

## Domain Verification

For some TLDs, domain verification is required:

```bash
kubidu domains verify example.com
```

Add the TXT record shown, then:

```bash
kubidu domains check example.com
```

## Removing Domains

```bash
# Remove domain
kubidu domains remove myapp.example.com

# Force (skip confirmation)
kubidu domains remove myapp.example.com --force
```

## Custom SSL Certificates

For enterprise customers needing custom certificates:

```bash
kubidu domains add myapp.example.com \
  --cert /path/to/cert.pem \
  --key /path/to/key.pem
```

Or via dashboard upload.

## Path-Based Routing

Route different paths to different services:

```yaml
# kubidu.yaml
routing:
  - path: /api/*
    service: api
    
  - path: /static/*
    service: cdn
    
  - path: /*
    service: web
```

## Headers & Security

### HSTS

Enabled by default for all SSL domains:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Custom Headers

```yaml
# kubidu.yaml
headers:
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Content-Security-Policy: "default-src 'self'"
```

## CORS Configuration

```yaml
# kubidu.yaml
cors:
  enabled: true
  origins:
    - https://app.example.com
    - https://admin.example.com
  methods: [GET, POST, PUT, DELETE]
  headers: [Content-Type, Authorization]
  credentials: true
  max_age: 86400
```

## Troubleshooting

### DNS Not Propagating

1. Check current DNS:
   ```bash
   dig myapp.example.com
   ```

2. Try different DNS:
   ```bash
   dig @8.8.8.8 myapp.example.com
   ```

3. Wait up to 48 hours for full propagation

### SSL Certificate Error

1. Check domain points to Kubidu:
   ```bash
   kubidu domains check myapp.example.com
   ```

2. Ensure no CAA records blocking Let's Encrypt

3. Check certificate status in dashboard

### Domain Shows "Pending"

1. DNS not configured or not propagated
2. Run `kubidu domains check <domain>`
3. Wait and retry

### Mixed Content Warnings

1. Ensure all assets use HTTPS URLs
2. Update absolute URLs to relative
3. Check for hardcoded HTTP URLs

## See Also

- [Deployments](./deployments.md)
- [Configuration Reference](../reference/configuration.md)
