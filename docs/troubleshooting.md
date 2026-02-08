# Troubleshooting

Common issues and their solutions.

## Build Issues

### Build Failed: Dockerfile Not Found

**Error:**
```
Error: Cannot find Dockerfile in repository
```

**Solutions:**
1. Create a Dockerfile in your project root
2. Specify the path in `kubidu.yaml`:
   ```yaml
   build:
     dockerfile: docker/Dockerfile
   ```
3. Remove Dockerfile to use auto-detection (Nixpacks)

### Build Failed: npm install Error

**Error:**
```
npm ERR! code ERESOLVE
npm ERR! Could not resolve dependency
```

**Solutions:**
1. Update `package-lock.json`:
   ```bash
   rm package-lock.json
   npm install
   git add package-lock.json
   kubidu deploy
   ```
2. Use `--legacy-peer-deps` in your Dockerfile:
   ```dockerfile
   RUN npm ci --legacy-peer-deps
   ```

### Build Failed: Out of Memory

**Error:**
```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

**Solutions:**
1. Increase Node memory in Dockerfile:
   ```dockerfile
   ENV NODE_OPTIONS="--max-old-space-size=4096"
   ```
2. Upgrade to a larger build tier in dashboard

### Build Takes Too Long

**Solutions:**
1. Use `.kubiduignore` to exclude unnecessary files:
   ```
   node_modules/
   .git/
   tests/
   docs/
   ```
2. Optimize Dockerfile with multi-stage builds:
   ```dockerfile
   FROM node:18 AS builder
   RUN npm ci && npm run build
   
   FROM node:18-alpine
   COPY --from=builder /app/dist ./dist
   ```
3. Enable layer caching (default)

---

## Deployment Issues

### Deployment Timeout

**Error:**
```
Error: Deployment timed out waiting for health check
```

**Solutions:**
1. Check your app starts within timeout (default 300s):
   ```yaml
   deploy:
     timeout: 600  # Increase to 10 minutes
   ```
2. Verify health endpoint returns 200:
   ```bash
   curl http://localhost:3000/health
   ```
3. Check logs for startup errors:
   ```bash
   kubidu logs --build
   ```

### Health Check Failed

**Error:**
```
Error: Health check failed: GET /health returned 404
```

**Solutions:**
1. Add health endpoint:
   ```javascript
   app.get('/health', (req, res) => {
     res.status(200).send('OK');
   });
   ```
2. Update health check path:
   ```yaml
   deploy:
     healthcheck: /api/health
   ```
3. Disable health check (not recommended):
   ```yaml
   deploy:
     healthcheck: null
   ```

### Container Crashes Immediately

**Error:**
```
Error: Container exited with code 1
```

**Solutions:**
1. Check logs:
   ```bash
   kubidu logs
   ```
2. Verify start command in `package.json`:
   ```json
   {
     "scripts": {
       "start": "node index.js"
     }
   }
   ```
3. Ensure app listens on `PORT`:
   ```javascript
   const port = process.env.PORT || 3000;
   app.listen(port);
   ```

### Wrong Port

**Error:**
```
Error: No open ports detected
```

**Solutions:**
1. Listen on `process.env.PORT`:
   ```javascript
   const port = process.env.PORT || 3000;
   ```
2. Specify port in config:
   ```yaml
   deploy:
     port: 3000
   ```
3. Expose port in Dockerfile:
   ```dockerfile
   EXPOSE 3000
   ```

---

## Environment Variable Issues

### Variable Not Available

**Symptoms:** `process.env.MY_VAR` is undefined

**Solutions:**
1. Check variable exists:
   ```bash
   kubidu env list
   ```
2. Redeploy after setting:
   ```bash
   kubidu env set MY_VAR=value
   kubidu deploy
   ```
3. Check for typos in variable name

### Secret Not Working

**Solutions:**
1. Verify it's set as secret:
   ```bash
   kubidu env list
   # DATABASE_URL  ********  secret
   ```
2. Check application reads correctly:
   ```javascript
   console.log('DB URL exists:', !!process.env.DATABASE_URL);
   ```
3. Re-set the secret:
   ```bash
   kubidu env unset DATABASE_URL
   kubidu env set DATABASE_URL=... --secret
   ```

---

## Domain Issues

### SSL Certificate Pending

**Symptoms:** SSL shows "pending" status

**Solutions:**
1. Verify DNS configuration:
   ```bash
   kubidu domains check example.com
   dig example.com CNAME
   ```
2. Wait for DNS propagation (up to 48 hours)
3. Check for CAA records:
   ```bash
   dig example.com CAA
   # Remove or add: 0 issue "letsencrypt.org"
   ```

### Domain Not Resolving

**Solutions:**
1. Check DNS points to Kubidu:
   ```bash
   dig +short example.com
   ```
2. Verify CNAME or A record is correct
3. Try different DNS resolver:
   ```bash
   dig @8.8.8.8 example.com
   ```

### Mixed Content Warnings

**Symptoms:** Browser shows mixed content warning

**Solutions:**
1. Update all URLs to HTTPS in code
2. Use relative URLs: `/api/users` instead of `http://...`
3. Check for hardcoded HTTP URLs in database

---

## Log Issues

### No Logs Appearing

**Solutions:**
1. Check service is running:
   ```bash
   kubidu status
   ```
2. Verify app writes to stdout/stderr:
   ```javascript
   console.log('This appears in logs');
   ```
3. Check log level:
   ```bash
   kubidu env set LOG_LEVEL=debug
   ```

### Logs Truncated

**Solutions:**
1. Increase line limit:
   ```bash
   kubidu logs -n 1000
   ```
2. Use time range:
   ```bash
   kubidu logs --since 1h
   ```
3. Export logs:
   ```bash
   kubidu logs download --since 2024-01-01
   ```

---

## Scaling Issues

### Auto-Scaling Not Working

**Solutions:**
1. Verify auto-scaling is enabled:
   ```bash
   kubidu autoscale status
   ```
2. Check metrics are reporting:
   ```bash
   kubidu metrics
   ```
3. Wait for cooldown period
4. Check min/max limits

### Replicas Keep Crashing

**Solutions:**
1. Check for OOM (Out of Memory):
   ```bash
   kubidu logs | grep -i "oom\|killed"
   ```
2. Increase memory limit:
   ```yaml
   resources:
     memory: 1Gi
   ```
3. Check for infinite loops or memory leaks

---

## Authentication Issues

### Login Failed

**Solutions:**
1. Clear credentials and retry:
   ```bash
   kubidu logout
   kubidu login
   ```
2. Check network/proxy settings
3. Try token-based auth:
   ```bash
   kubidu login --token YOUR_TOKEN
   ```

### Token Expired

**Solutions:**
1. Re-login:
   ```bash
   kubidu login
   ```
2. Generate new API token in dashboard

### Permission Denied

**Error:**
```
Error: Access denied. You do not have permission for this action.
```

**Solutions:**
1. Check your role in the project
2. Contact project owner for access
3. Verify correct project:
   ```bash
   kubidu link
   ```

---

## CLI Issues

### Command Not Found

**Solutions:**
1. Reinstall CLI:
   ```bash
   npm install -g @kubidu/cli
   ```
2. Check PATH includes npm global:
   ```bash
   npm bin -g
   ```
3. Use npx:
   ```bash
   npx @kubidu/cli deploy
   ```

### Connection Timeout

**Solutions:**
1. Check internet connection
2. Check proxy settings:
   ```bash
   export HTTP_PROXY=http://...
   export HTTPS_PROXY=http://...
   ```
3. Try different network

---

## Getting More Help

### Check Service Status

```bash
# Platform status
open https://status.kubidu.dev
```

### Debug Mode

```bash
# Enable debug output
DEBUG=kubidu:* kubidu deploy
```

### Contact Support

- **Discord**: [discord.gg/kubidu](https://discord.gg/kubidu)
- **Email**: support@kubidu.dev
- **Documentation**: [docs.kubidu.dev](https://docs.kubidu.dev)

### Report a Bug

1. Check existing issues
2. Gather logs: `kubidu logs > debug.log`
3. Include reproduction steps
4. Submit at [github.com/kubidu/cli/issues](https://github.com/kubidu/cli/issues)
