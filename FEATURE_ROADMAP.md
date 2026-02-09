# Kubidu Feature Roadmap

*Created: 2026-02-09 | Product Manager: Django (AI)*

## 📊 Feature Matrix: Kubidu vs. Competition

| Feature | Railway | Render | Fly.io | Heroku | **Kubidu** |
|---------|---------|--------|--------|--------|------------|
| Git Push Deploy | ✅ | ✅ | ✅ | ✅ | ✅ |
| CLI Tool | ✅ | ✅ | ✅ | ✅ | ✅ |
| Custom Domains | ✅ | ✅ | ✅ | ✅ | ⚠️ Partial |
| Auto SSL (Let's Encrypt) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Preview Deployments | ✅ | ✅ | ✅ | ❌ | ❌ |
| GitHub Actions Integration | ✅ | ✅ | ✅ | ✅ | ❌ |
| Rollbacks | ✅ | ✅ | ✅ | ✅ | ⚠️ Planned |
| Environment Cloning | ✅ | ✅ | ❌ | ✅ | ❌ |
| Scheduled Tasks/Cron | ✅ | ✅ | ✅ | ✅ | ❌ |
| Database Provisioning | ✅ | ✅ | ✅ | ✅ | ❌ |
| Database Backups | ✅ | ✅ | ✅ | ✅ | ❌ |
| Log Streaming | ✅ | ✅ | ✅ | ✅ | ⚠️ Planned |
| Metrics Dashboard | ✅ | ✅ | ✅ | ✅ | ❌ |
| **GDPR Compliance** | ⚠️ | ⚠️ | ⚠️ | ❌ | ✅ |
| **EU Data Residency** | ❌ | ⚠️ | ⚠️ | ❌ | ✅ |
| **ISO 27001** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🎯 What Kubidu Already Has

### ✅ Fully Implemented
- **CLI Tool** (`@kubidu/cli`) - deploy, logs, env, domains, status, ps, init, link, login/logout
- **Git Push Deploy** - Webhook service triggers builds on push
- **Docker Deployments** - Build from Dockerfile or pre-built images
- **Environment Variables** - AES-256-GCM encrypted, scoped to service/deployment
- **User Namespaces** - K8s isolation per user
- **Audit Logging** - ISO 27001 compliant
- **GDPR Features** - Data export/deletion with grace period
- **Watch Mode** - `kubidu deploy --watch` for dev

### ⚠️ Partially Implemented
- **Custom Domains** - Entity exists, CNAME verification TODO
- **Rollback** - Data model supports it, UI/API not connected
- **Log Streaming** - Planned, WebSocket infrastructure ready
- **Scaling** - CPU/Memory limits in model, UI missing

---

## 🚦 Priority Tiers

### 🔴 MUST-HAVE (ohne das nutzt keiner die Platform)

Without these features, developers won't even try Kubidu. These are table stakes for any modern PaaS.

| # | Feature | Why Critical | Effort | Impact |
|---|---------|--------------|--------|--------|
| 1 | **HTTPS/SSL Auto-Provisioning** | No one deploys production without HTTPS | Medium | 🔥🔥🔥🔥🔥 |
| 2 | **Build & Runtime Logs** | Can't debug = can't use | Medium | 🔥🔥🔥🔥🔥 |
| 3 | **One-Click Rollback** | Broken deploy = panic. Must rollback fast | Low | 🔥🔥🔥🔥 |

### 🟡 SHOULD-HAVE (wichtig für Growth)

These features are expected by developers coming from Railway/Render. Missing them = friction = churn.

| # | Feature | Why Important | Effort | Impact |
|---|---------|---------------|--------|--------|
| 4 | **Preview Deployments** | PR reviews need isolated environments | High | 🔥🔥🔥🔥 |
| 5 | **GitHub Actions Integration** | Teams use CI/CD pipelines, need "Wait for CI" | Medium | 🔥🔥🔥🔥 |
| 6 | **Metrics Dashboard** | CPU/Memory/Request graphs for optimization | Medium | 🔥🔥🔥 |
| 7 | **Managed Databases** | PostgreSQL, Redis as add-ons | High | 🔥🔥🔥🔥 |
| 8 | **Environment Cloning** | Clone staging → production easily | Low | 🔥🔥🔥 |

### 🟢 NICE-TO-HAVE (Differenzierung)

These features differentiate Kubidu from competitors but aren't blockers for adoption.

| # | Feature | Why Nice | Effort | Impact |
|---|---------|----------|--------|--------|
| 9 | **Scheduled Tasks / Cron** | Background jobs, maintenance scripts | Medium | 🔥🔥 |
| 10 | **Database Backups** | Peace of mind for managed DBs | Medium | 🔥🔥 |
| 11 | **Multi-Region Deploy** | Low latency globally | Very High | 🔥🔥 |
| 12 | **Private Networking** | Service-to-service without public internet | High | 🔥🔥 |
| 13 | **Autoscaling (HPA)** | Scale on CPU/Memory/Requests | Medium | 🔥🔥 |

---

## 📋 Detailed Feature Specs

### 1. 🔐 HTTPS/SSL Auto-Provisioning [MUST-HAVE]

**Current State:** Custom domains exist but no automatic SSL.

**What's Needed:**
- cert-manager in K8s cluster
- Let's Encrypt issuer configuration
- Automatic certificate request on domain add
- Certificate renewal automation
- Status indicators in UI (Pending, Active, Failed)

**Implementation:**
```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: {{ domain-name }}
  namespace: user-{{ userId }}
spec:
  secretName: {{ domain-name }}-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - {{ custom-domain }}
```

**Effort:** 2-3 days | **Priority:** P0

---

### 2. 📜 Build & Runtime Logs [MUST-HAVE]

**Current State:** Build service has logs, but not streamed to frontend.

**What's Needed:**
- WebSocket endpoint for log streaming
- Build logs from Bull job output
- Runtime logs from `kubectl logs -f`
- Log persistence (last 7 days)
- Log search/filter in UI

**Implementation:**
- Add `packages/api/src/modules/logs/logs.gateway.ts`
- Use `@kubernetes/client-node` to stream pod logs
- Store logs in Redis (TTL) or S3

**Effort:** 3-4 days | **Priority:** P0

---

### 3. ⏪ One-Click Rollback [MUST-HAVE]

**Current State:** Deployment history exists, rollback logic not implemented.

**What's Needed:**
- "Rollback" button on deployment history
- Redeploy previous image without rebuild
- Keep env vars from target deployment
- Instant rollback (no build step)
- Rollback confirmation dialog

**Implementation:**
```typescript
// DeploymentService
async rollback(serviceId: string, targetDeploymentId: string) {
  const target = await this.getDeployment(targetDeploymentId);
  // Use same image, skip build
  return this.createDeployment({
    serviceId,
    imageUrl: target.imageUrl,
    skipBuild: true,
    rollbackFrom: target.id,
  });
}
```

**Effort:** 1-2 days | **Priority:** P0

---

### 4. 🔀 Preview Deployments [SHOULD-HAVE]

**Current State:** Only main branch deploys.

**What's Needed:**
- Auto-deploy on PR open/sync
- Unique URL: `pr-123.app.kubidu.app`
- Comment on PR with preview URL
- Auto-cleanup on PR close
- Isolated env vars (fork from main)

**GitHub Webhook Events:**
- `pull_request.opened`
- `pull_request.synchronize`
- `pull_request.closed`

**Effort:** 5-7 days | **Priority:** P1

---

### 5. 🔄 GitHub Actions Integration [SHOULD-HAVE]

**Current State:** Deploys immediately on push.

**What's Needed:**
- "Wait for CI" option in service settings
- GitHub Checks API integration
- Only deploy after CI passes
- Skip deploy on CI failure
- Manual override button

**Implementation:**
- Store `waitForCi: boolean` on Service
- On webhook, create pending deploy
- Poll GitHub Checks API or use checks webhook
- Trigger deploy only when all checks pass

**Effort:** 3-4 days | **Priority:** P1

---

### 6. 📊 Metrics Dashboard [SHOULD-HAVE]

**What's Needed:**
- Real-time CPU/Memory graphs
- Request count & latency
- Error rate tracking
- Prometheus + Grafana embedded
- Per-service metrics view

**Effort:** 5-7 days | **Priority:** P1

---

### 7. 🗄️ Managed Databases [SHOULD-HAVE]

**What's Needed:**
- PostgreSQL provisioning
- Redis provisioning
- Connection string injection
- Database credentials management
- Storage quotas per plan

**Effort:** 10+ days | **Priority:** P1.5

---

### 8. 📋 Environment Cloning [SHOULD-HAVE]

**What's Needed:**
- "Clone Environment" button
- Copy all env vars to new environment
- Create staging from production
- Selective variable cloning (exclude secrets?)

**Effort:** 1-2 days | **Priority:** P1

---

### 9. ⏰ Scheduled Tasks / Cron [NICE-TO-HAVE]

**What's Needed:**
- K8s CronJob resource creation
- Cron expression editor in UI
- Task execution history
- Manual trigger button
- Timeout configuration

**Implementation:**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: {{ task-name }}
spec:
  schedule: "0 * * * *"  # Hourly
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: task
            image: {{ service-image }}
            command: {{ task-command }}
```

**Effort:** 4-5 days | **Priority:** P2

---

## 🗓️ Proposed Timeline

### Week 1 (MVP Critical)
- [ ] **Day 1-2:** HTTPS/SSL Auto-Provisioning
- [ ] **Day 3-4:** Build & Runtime Logs  
- [ ] **Day 5:** One-Click Rollback
- [ ] **Day 6-7:** Testing & Polish

### Week 2 (Growth Features)
- [ ] Preview Deployments
- [ ] GitHub Actions Integration
- [ ] Environment Cloning

### Week 3-4 (Platform Maturity)
- [ ] Metrics Dashboard
- [ ] Managed Databases (start)
- [ ] Scheduled Tasks

---

## 🏁 Success Metrics

| Feature | Success Criteria |
|---------|------------------|
| SSL | 100% of custom domains have valid certs within 5 min |
| Logs | < 2s latency from container to UI |
| Rollback | Rollback completes in < 30 seconds |
| Previews | PR comment posted within 2 min of PR open |
| CI Wait | Zero deploys on failing CI |

---

## 📝 Next Steps

1. **Create GitHub Issues** for top 3 MUST-HAVEs
2. **Prioritize SSL** - users literally can't go live without it
3. **Implement in order** - SSL → Logs → Rollback
4. **Ship week 1**, iterate from there

---

*"Ship fast, fix fast, listen to users."*
