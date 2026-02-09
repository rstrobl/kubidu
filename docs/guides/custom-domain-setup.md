# Set up Custom Domain

Complete guide to configuring custom domains with automatic SSL on Kubidu.

## Overview

Every Kubidu service gets a free subdomain:
```
https://your-service-abc123.kubidu.app
```

This guide shows you how to add your own domain with:
- Automatic SSL certificates (Let's Encrypt)
- HTTP → HTTPS redirect
- Apex domain support (example.com)
- Subdomain support (app.example.com)

## Quick Setup

```bash
# Add your domain
kubidu domains add app.example.com

# You'll see DNS instructions
# Configure your DNS, then verify:
kubidu domains check app.example.com

# Done! SSL is automatic
```

## Step-by-Step Guide

### Step 1: Add Domain to Kubidu

```bash
kubidu domains add app.example.com
```

Output:
```
✔ Domain added: app.example.com

Configure your DNS with the following record:

  Type:  CNAME
  Name:  app
  Value: abc123.kubidu.app

SSL certificate will be provisioned automatically once DNS is configured.
```

### Step 2: Configure DNS

Add the DNS record at your domain registrar.

#### For Subdomains (Recommended)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | app | abc123.kubidu.app | 3600 |

#### For Root/Apex Domains

Root domains (example.com without subdomain) can't use CNAME. Use A record:

```bash
# Get Kubidu IP
kubidu domains info
```

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 95.217.xxx.xxx | 3600 |

### Step 3: Verify DNS

Wait a few minutes for DNS propagation, then verify:

```bash
kubidu domains check app.example.com
```

Output:
```
✔ DNS configured correctly
✔ SSL certificate issued
✔ Domain is active

Your domain is ready: https://app.example.com
```

### Step 4: Test Your Domain

```bash
curl -I https://app.example.com
```

## DNS Provider Guides

### Cloudflare

1. Go to DNS settings
2. Add record:
   - Type: CNAME
   - Name: app
   - Target: abc123.kubidu.app
3. **Important:** Set Proxy status to **DNS only** (gray cloud)
   - Orange cloud (proxied) can cause SSL issues

### GoDaddy

1. Go to Domain Settings → DNS Management
2. Click Add
3. Select CNAME
4. Name: app (or @ for root)
5. Value: abc123.kubidu.app
6. TTL: 1 Hour
7. Save

### Namecheap

1. Go to Domain List → Manage
2. Advanced DNS tab
3. Add New Record
4. Type: CNAME Record
5. Host: app
6. Value: abc123.kubidu.app
7. Save All Changes

### AWS Route 53

```bash
# Via AWS CLI
aws route53 change-resource-record-sets \
  --hosted-zone-id ZXXXXX \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "CNAME",
        "TTL": 3600,
        "ResourceRecords": [{"Value": "abc123.kubidu.app"}]
      }
    }]
  }'
```

### Google Domains

1. Go to DNS
2. Custom Records → Manage Custom Records
3. Add:
   - Host name: app
   - Type: CNAME
   - Data: abc123.kubidu.app
4. Save

## Multiple Domains

Add as many domains as you need:

```bash
kubidu domains add app.example.com
kubidu domains add api.example.com
kubidu domains add example.com
kubidu domains add www.example.com
```

### Set Primary Domain

```yaml
# kubidu.yaml
domains:
  primary: app.example.com
```

### Configure Redirects

Redirect www to non-www (or vice versa):

```yaml
# kubidu.yaml
domains:
  primary: example.com
  redirects:
    - www.example.com
```

Or via CLI:

```bash
# www.example.com → example.com
kubidu domains redirect www.example.com example.com
```

## Wildcard Domains

For *.example.com support:

```bash
kubidu domains add "*.example.com"
```

Wildcard requires DNS verification:

```
Please add the following TXT record:

  Type:  TXT
  Name:  _acme-challenge.example.com
  Value: abc123xyz...

Then run: kubidu domains verify example.com
```

## SSL Certificates

### Automatic SSL

Kubidu automatically:
1. ✅ Provisions Let's Encrypt certificate
2. ✅ Configures HTTPS
3. ✅ Redirects HTTP → HTTPS
4. ✅ Renews before expiration

### Check SSL Status

```bash
kubidu domains list

# DOMAIN               STATUS   SSL      EXPIRES
# ──────────────────────────────────────────────────
# app.example.com      active   active   2026-05-15
# api.example.com      active   active   2026-05-15
# www.example.com      active   redirect
```

### Force HTTPS

Already enabled by default. All HTTP requests redirect to HTTPS.

### HSTS

HTTP Strict Transport Security is enabled by default:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Custom SSL Certificates

For enterprise customers who need custom certificates:

```bash
kubidu domains add app.example.com \
  --cert /path/to/certificate.pem \
  --key /path/to/private-key.pem \
  --chain /path/to/ca-chain.pem
```

## Troubleshooting

### SSL Certificate Pending

```bash
kubidu domains check app.example.com

# ❌ DNS not configured
# Please add: CNAME app → abc123.kubidu.app
```

**Solutions:**
1. Verify DNS record is correct
2. Wait for DNS propagation (up to 48 hours)
3. Check for typos in domain name

### DNS Not Propagating

Check current DNS:

```bash
# Using dig
dig app.example.com

# Using nslookup
nslookup app.example.com

# Check different DNS servers
dig @8.8.8.8 app.example.com
dig @1.1.1.1 app.example.com
```

### CAA Record Blocking

If your domain has CAA records, add Let's Encrypt:

```bash
# Check CAA records
dig CAA example.com
```

Add CAA record allowing Let's Encrypt:

| Type | Name | Value |
|------|------|-------|
| CAA | @ | 0 issue "letsencrypt.org" |

### Cloudflare Proxy Issues

If using Cloudflare with orange cloud (proxied):
1. Set to DNS only (gray cloud), OR
2. Set Cloudflare SSL to "Full (strict)"

### Certificate Renewal Failed

Certificates auto-renew. If renewal fails:

```bash
# Force renewal
kubidu domains renew app.example.com

# Check domain configuration
kubidu domains check app.example.com
```

## Advanced Configuration

### Security Headers

Add security headers in `kubidu.yaml`:

```yaml
headers:
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: "1; mode=block"
  Content-Security-Policy: "default-src 'self'"
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: "camera=(), microphone=(), geolocation=()"
```

### CORS

Configure Cross-Origin Resource Sharing:

```yaml
cors:
  enabled: true
  origins:
    - https://app.example.com
    - https://admin.example.com
  methods: [GET, POST, PUT, DELETE, OPTIONS]
  headers: [Content-Type, Authorization, X-Request-ID]
  credentials: true
  max_age: 86400
```

### Path-Based Routing

Route different paths to different services:

```yaml
routing:
  - path: /api/*
    service: api
    strip_prefix: true
    
  - path: /static/*
    service: cdn
    
  - path: /*
    service: web
```

## Domain Management

### List All Domains

```bash
kubidu domains list
```

### Remove a Domain

```bash
kubidu domains remove app.example.com

# Force remove (skip confirmation)
kubidu domains remove app.example.com --force
```

### Transfer Between Services

```bash
# Remove from old service
kubidu domains remove app.example.com

# Add to new service
kubidu --service api domains add app.example.com
```

## Best Practices

### 1. Use Subdomains for Services

```
app.example.com     → Frontend
api.example.com     → API
admin.example.com   → Admin panel
docs.example.com    → Documentation
```

### 2. Set Up Redirects

Redirect legacy domains to primary:

```yaml
domains:
  primary: app.example.com
  redirects:
    - www.example.com
    - old-app.example.com
    - beta.example.com
```

### 3. Environment-Specific Domains

```
staging.example.com  → Staging environment
app.example.com      → Production
```

### 4. Monitor Expiration

SSL certificates auto-renew, but monitor:

```bash
kubidu domains list --show-expiry
```

## See Also

- [Deployments](./deployments.md)
- [CORS Configuration](../reference/configuration.md#cors)
- [Security Headers](../reference/configuration.md#headers)
