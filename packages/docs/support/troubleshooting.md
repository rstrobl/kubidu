# Troubleshooting

Solutions to common issues with Kubidu.

## Deployment Issues

### Build fails with "no space left on device"

Your Docker image is too large. Solutions:

1. **Use multi-stage builds**
   ```dockerfile
   FROM node:20 AS builder
   WORKDIR /app
   COPY . .
   RUN npm ci && npm run build
   
   FROM node:20-alpine
   WORKDIR /app
   COPY --from=builder /app/dist ./dist
   CMD ["node", "dist/index.js"]
   ```

2. **Add .dockerignore**
   ```gitignore
   node_modules
   .git
   *.md
   test/
   coverage/
   ```

3. **Use smaller base images**
   ```dockerfile
   # Instead of: FROM node:20
   FROM node:20-alpine
   ```

### Build fails with "package not found"

Check your `package.json` and lock file are in sync:

```bash
rm -rf node_modules package-lock.json
npm install
```

Commit and push the updated `package-lock.json`.

### "Port not exposed"

Your container isn't exposing the right port.

1. **Add EXPOSE to Dockerfile**
   ```dockerfile
   EXPOSE 3000
   ```

2. **Or configure in kubidu.json**
   ```json
   {
     "deploy": {
       "port": 3000
     }
   }
   ```

3. **Make sure your app listens on the right port**
   ```javascript
   const port = process.env.PORT || 3000;
   app.listen(port);
   ```

### Deployment stuck in "Building"

If a build takes more than 10 minutes:

1. Check build logs: `kubidu logs --build`
2. Cancel and retry: `kubidu deploy --no-cache`
3. Check for infinite loops in build scripts

### "Health check failed"

Your app isn't responding to health checks.

1. **Implement a health endpoint**
   ```javascript
   app.get('/health', (req, res) => {
     res.status(200).json({ status: 'ok' });
   });
   ```

2. **Configure the health check path**
   ```json
   {
     "deploy": {
       "healthCheck": {
         "path": "/health"
       }
     }
   }
   ```

3. **Check your app starts quickly**
   - Health checks start 10 seconds after container starts
   - App must respond within 5 seconds

---

## App Issues

### App keeps crashing/restarting

1. **Check logs**
   ```bash
   kubidu logs --since 1h
   ```

2. **Check for OOM (Out of Memory)**
   ```bash
   kubidu events --type oom
   ```
   
   If OOM, increase memory:
   ```bash
   kubidu config set deploy.resources.memory 1Gi
   ```

3. **Check exit code**
   Common exit codes:
   - `137`: OOM killed
   - `143`: SIGTERM (normal shutdown)
   - `1`: Application error

### App is slow

1. **Check resource usage**
   ```bash
   kubidu metrics
   ```

2. **Scale up if needed**
   ```bash
   kubidu scale 3
   # or increase resources
   kubidu config set deploy.resources.cpu 2
   ```

3. **Check for CPU throttling**
   ```bash
   kubidu metrics cpu --include-throttling
   ```

4. **Check database connection**
   - Database in same region?
   - Connection pooling enabled?

### Environment variables not working

1. **Verify they're set**
   ```bash
   kubidu env list
   ```

2. **Redeploy after changing**
   ```bash
   kubidu deploy
   ```

3. **Check variable names**
   - Case-sensitive
   - No spaces
   - Valid characters: A-Z, 0-9, underscore

4. **Check access in code**
   ```javascript
   // Correct
   process.env.DATABASE_URL
   
   // Wrong (not a function)
   process.env('DATABASE_URL')
   ```

---

## Domain Issues

### "Domain not verified"

1. **Check DNS propagation**
   - Use [whatsmydns.net](https://whatsmydns.net)
   - DNS can take up to 48 hours

2. **Verify CNAME is correct**
   ```
   api.example.com  CNAME  my-app-abc123.kubidu.io
   ```

3. **Check for typos**
   - Trailing dots matter in some DNS providers
   - Check the target URL is correct

4. **Try verification again**
   ```bash
   kubidu domains verify api.example.com
   ```

### "SSL certificate pending"

SSL provisioning requires DNS to be correct first.

1. Wait for domain verification
2. Allow 10-15 minutes for certificate issuance
3. Check status: `kubidu domains list`

If stuck, contact support.

### "Certificate error" in browser

1. **Clear browser cache**
   - Hard refresh: Ctrl+Shift+R / Cmd+Shift+R
   - Or try incognito window

2. **Check you're using HTTPS**
   - `https://` not `http://`

3. **Check domain configuration**
   ```bash
   kubidu domains list
   ```

4. **Cloudflare users**
   - Set SSL mode to "Full (strict)"
   - Or use "DNS only" mode

---

## CLI Issues

### "Command not found: kubidu"

1. **Check installation**
   ```bash
   npm list -g @kubidu/cli
   ```

2. **Add npm bin to PATH**
   ```bash
   export PATH="$PATH:$(npm bin -g)"
   ```
   
   Add to `~/.bashrc` or `~/.zshrc` for persistence.

3. **Reinstall**
   ```bash
   npm uninstall -g @kubidu/cli
   npm install -g @kubidu/cli
   ```

### "Unauthorized" error

1. **Check you're logged in**
   ```bash
   kubidu whoami
   ```

2. **Login again**
   ```bash
   kubidu login
   ```

3. **Check token is valid**
   ```bash
   kubidu tokens list
   ```

### "Permission denied"

Your account doesn't have access.

1. **Check your role**
   ```bash
   kubidu whoami
   ```

2. **Check workspace**
   ```bash
   kubidu workspace list
   kubidu workspace switch correct-workspace
   ```

3. **Ask admin for access**

---

## Performance Issues

### Slow builds

1. **Use .dockerignore**
   ```gitignore
   node_modules
   .git
   *.md
   test/
   coverage/
   ```

2. **Optimize Dockerfile layer order**
   ```dockerfile
   # Dependencies first (cached)
   COPY package*.json ./
   RUN npm ci
   
   # Source code last (changes often)
   COPY . .
   ```

3. **Use smaller base images**
   ```dockerfile
   FROM node:20-alpine
   ```

### High memory usage

1. **Profile your app**
   ```bash
   kubidu profile memory --duration 5m
   ```

2. **Check for memory leaks**
   - Event listeners not removed
   - Caches growing unbounded
   - Connections not closed

3. **Increase limits if needed**
   ```bash
   kubidu config set deploy.resources.memory 2Gi
   ```

### High CPU usage

1. **Check for busy loops**
   - Polling instead of events
   - Tight loops without async

2. **Enable caching**
   - Database query caching
   - HTTP response caching

3. **Scale horizontally**
   ```bash
   kubidu scale auto --min 2 --max 10
   ```

---

## Getting More Help

### Collect Debug Info

```bash
# Version info
kubidu --version

# Current status
kubidu status

# Recent logs
kubidu logs --since 1h

# Events
kubidu events
```

### Contact Support

**Community (Free)**
- [Discord](https://discord.gg/kubidu)
- [GitHub Issues](https://github.com/kubidu/kubidu/issues)

**Email (Pro+)**
- support@kubidu.io
- Include: app name, error message, steps to reproduce

**Priority (Team+)**
- In-app chat
- 4-hour response time guarantee

### Status Page

Check if there's an ongoing incident:
- [status.kubidu.io](https://status.kubidu.io)
