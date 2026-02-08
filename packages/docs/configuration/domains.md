# Custom Domains

Connect your own domain to your Kubidu app. Free SSL included.

## Adding a Domain

### Via CLI

```bash
kubidu domains add api.example.com
```

### Via Dashboard

1. Go to your app in the [Dashboard](https://app.kubidu.io)
2. Click "Settings" → "Domains"
3. Enter your domain
4. Click "Add Domain"

## DNS Configuration

After adding your domain, configure DNS at your registrar.

### For Subdomains (Recommended)

Add a `CNAME` record pointing to your Kubidu URL:

```
api.example.com  CNAME  my-app-abc123.kubidu.io
```

### For Root Domains

Root domains (apex domains like `example.com`) can't use CNAME. Use one of these options:

#### Option 1: ALIAS/ANAME Record

If your DNS provider supports ALIAS/ANAME:

```
example.com  ALIAS  my-app-abc123.kubidu.io
```

Supported providers: Cloudflare, DNSimple, Route53, NS1

#### Option 2: A Records

Use our static IPs:

```
example.com  A  185.199.108.153
example.com  A  185.199.109.153
```

::: tip
We recommend using a subdomain like `www.example.com` and redirecting the root domain to it.
:::

## Verifying Your Domain

After configuring DNS, verify ownership:

```bash
kubidu domains verify api.example.com
```

Kubidu automatically checks every few minutes. Verification usually completes within 5 minutes.

### Check Status

```bash
kubidu domains list
```

```
DOMAIN              STATUS      SSL
api.example.com     ● Active    ✓ Valid
www.example.com     ○ Pending   ✗ Waiting
```

## SSL Certificates

Kubidu automatically provisions and renews SSL certificates via Let's Encrypt.

### Features

- **Automatic provisioning** — Certificates issued within minutes
- **Auto-renewal** — Renewed 30 days before expiration
- **Free** — No additional cost
- **A+ rating** — Modern TLS configuration

### Force HTTPS

All traffic is automatically redirected to HTTPS. Disable if needed:

```json
{
  "domains": {
    "api.example.com": {
      "forceHttps": false
    }
  }
}
```

## Wildcard Domains

Add a wildcard domain for dynamic subdomains:

```bash
kubidu domains add "*.example.com"
```

Configure DNS:

```
*.example.com  CNAME  my-app-abc123.kubidu.io
```

Now any subdomain works:
- `user1.example.com`
- `user2.example.com`
- `anything.example.com`

## Multiple Domains

You can add multiple domains to a single app:

```bash
kubidu domains add api.example.com
kubidu domains add api.example.org
kubidu domains add v1.api.example.com
```

## Primary Domain

Set a primary domain (used in logs, notifications):

```bash
kubidu domains set-primary api.example.com
```

## Removing a Domain

```bash
kubidu domains remove api.example.com
```

Remember to also remove the DNS record at your registrar.

## Cloudflare Setup

If you're using Cloudflare:

### 1. Add CNAME Record

```
Name: api
Target: my-app-abc123.kubidu.io
Proxy status: DNS only (grey cloud)
```

::: warning
We recommend "DNS only" mode. Cloudflare's proxy can conflict with Kubidu's SSL.
:::

### 2. If Using Cloudflare Proxy (Orange Cloud)

Set SSL mode to "Full (strict)":

1. Go to SSL/TLS → Overview
2. Select "Full (strict)"

## Troubleshooting

### "Domain not verified"

1. Check DNS propagation: [whatsmydns.net](https://www.whatsmydns.net)
2. Ensure CNAME/A record is correct
3. Wait up to 48 hours for DNS propagation

### "SSL certificate pending"

1. Verify domain ownership first
2. Check domain DNS is correct
3. Wait 10-15 minutes for certificate issuance

### "Certificate error" in browser

1. Check you're using HTTPS, not HTTP
2. Clear browser cache
3. Try incognito/private window

### Using Cloudflare with issues

1. Try "DNS only" mode (grey cloud)
2. If using proxy, set SSL to "Full (strict)"
3. Disable Cloudflare's "Always Use HTTPS" (Kubidu handles this)

## Domain Configuration

Advanced domain options in `kubidu.json`:

```json
{
  "domains": {
    "api.example.com": {
      "primary": true,
      "forceHttps": true,
      "cors": {
        "origins": ["https://app.example.com"],
        "methods": ["GET", "POST"],
        "headers": ["Authorization"]
      },
      "headers": {
        "Strict-Transport-Security": "max-age=31536000",
        "X-Frame-Options": "DENY"
      }
    }
  }
}
```

## Redirects

Set up domain redirects:

```json
{
  "redirects": [
    {
      "source": "www.example.com",
      "destination": "example.com",
      "permanent": true
    }
  ]
}
```

Redirect old paths:

```json
{
  "redirects": [
    {
      "source": "/old-page",
      "destination": "/new-page",
      "permanent": true
    },
    {
      "source": "/blog/:slug",
      "destination": "https://blog.example.com/:slug",
      "permanent": false
    }
  ]
}
```
