# Kubidu MVP Scope

*Document created: 2026-02-08*
*Product Manager: Django (AI)*

## 🎯 Vision

Kubidu is a **GDPR & ISO 27001 compliant PaaS platform** for European businesses who need Railway/Heroku-like simplicity with guaranteed EU data residency.

## 🚀 MVP Goals

Get the **first paying customers** deployed within 1 week. Focus on the golden path:
> Signup → Connect GitHub → Deploy → Get a URL → Scale

---

## ✅ MVP Must-Have Features (P0)

### 1. Authentication & Onboarding
- [x] User registration with email/password
- [x] JWT-based login/logout
- [x] Password reset flow
- [ ] **Email verification** (critical for trust)
- [ ] **Onboarding wizard** (guide new users)

### 2. Projects
- [x] Create project
- [x] List user's projects
- [x] Project detail view
- [ ] **Project deletion** (with confirmation)
- [x] Project settings

### 3. Services (the core feature)
- [x] Create service from GitHub repo
- [x] Create service from Docker image
- [x] Service list in project view
- [x] Service detail with tabs (Overview, Deployments, Variables, Settings)
- [ ] **GitHub repo picker** (OAuth flow for private repos)

### 4. Deployments
- [x] Trigger deployment from UI
- [x] Build status tracking (PENDING → BUILDING → DEPLOYING → RUNNING/FAILED)
- [x] Deployment list per service
- [ ] **Build logs streaming** (WebSocket)
- [ ] **Runtime logs streaming** (WebSocket)
- [ ] **Redeploy button** (one-click redeploy)
- [ ] **Rollback to previous deployment**

### 5. Environment Variables
- [x] CRUD for environment variables
- [x] AES-256-GCM encryption at rest
- [ ] **Bulk edit mode** (paste .env file)
- [ ] **Show/hide values toggle**
- [ ] **Service-level vs deployment-level scoping** (UI clarity)

### 6. Domains & Networking
- [x] Auto-generated subdomain (*.kubidu.app)
- [ ] **Custom domain support** (CNAME verification)
- [ ] **HTTPS auto-provisioning** (Let's Encrypt)
- [ ] **Domain status indicators**

### 7. Scaling & Resources
- [x] CPU/Memory limits in data model
- [ ] **UI for resource configuration**
- [ ] **Replica count adjustment** (horizontal scaling)

---

## 🔜 Post-MVP Features (P1)

These are important but not blocking first customers:

- **Environments** (staging/production separation)
- **PR Preview Deployments** (auto-deploy on PR)
- **Webhooks for CI/CD** (GitHub Actions integration)
- **Team/Workspace management** (invite members)
- **Billing & subscription management** (Stripe)
- **API Keys for CLI** (already in data model)
- **2FA** (TOTP already implemented)
- **Audit logs viewer** (compliance feature)
- **GDPR data export/deletion** (already in API)

---

## ⚡ Scaling Features (P1.5 - High Priority)

Robert wants this ASAP:

- [ ] **Horizontal Pod Autoscaler (HPA)** - Scale based on CPU/memory
- [ ] **Request-based autoscaling** - Scale based on requests per second
- [ ] **Scale-to-Zero** - Serverless mode, save costs when idle
- [ ] **Manual replica control in UI** - Slider 1-10 replicas
- [ ] **Resource usage dashboard** - Real-time CPU/RAM graphs

### Implementation Notes:
```yaml
# K8s HPA Example
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## 🚫 Out of Scope (P2+)

Not needed for MVP:
- Database provisioning (users bring their own)
- Cron jobs
- Private networking between services
- Multi-region deployment
- CLI tool
- Mobile app
- Enterprise SSO

---

## 📊 Current State Assessment

Based on CLAUDE.md and code structure:

### ✅ Already Built
- Full NestJS API with auth, projects, services, deployments, domains, audit
- React dashboard with TailwindCSS, Zustand, React Query
- Build pipeline (Webhook → Build Service → Deploy Controller)
- K8s integration with user namespaces
- Encryption service for secrets
- Docker Compose dev environment

### ✅ Verified Working (2026-02-08)
- [x] Full flow works: Register → Login → Create Project → Add Service → Deploy → RUNNING
- [x] Docker deployment to K8s works end-to-end
- [x] Notifications system works (toast messages)
- [x] Service detail panel with all tabs (Overview, Deployments, Env, Domains, Settings)
- [x] System environment variables auto-injected (KUBIDU_SERVICE_ID, etc.)
- [x] Workspace auto-creation on registration
- [x] Canvas UI with service cards (Railway-style!)

### ⚠️ Not Yet Verified
- [ ] WebSocket logs streaming
- [ ] GitHub OAuth flow (requires GitHub App setup)
- [ ] Custom domain verification
- [ ] Rollback functionality

### 🔧 Fixed Issues
- [x] Migration order (workspaces before notifications)
- [x] Prisma schema sync with DB
- [x] Build service module missing
- [x] Port conflicts (8080→8180, 8081→8181)

### 📋 Remaining Work
- [ ] GitHub OAuth setup (GitHub App configuration)
- [ ] Bulk env var editing (UI exists, needs testing)
- [ ] Build logs streaming (WebSocket)
- [ ] Runtime logs streaming (K8s logs)
- [ ] Subdomain provisioning
- [ ] Custom domain verification
- [ ] Resource scaling UI
- [ ] Deployment rollback

---

## 🎨 Branding Direction

### Name: **Kubidu**
- Playful yet professional
- Kubernetes + "Du" (German for "you") → "Kubernetes for You"
- Easy to remember, pronounce, spell

### Tagline ✅ DECIDED
**"Deploy with confidence. Stay compliant."**

USPs:
1. 🌱 100% Green Energy (Renewable Powered)
2. 🇪🇺 EU-Hosted (Frankfurt, Germany)
3. 🔒 GDPR Compliant (Privacy First)
4. 📜 ISO 27001 Ready (Audit Logging)

### Color Palette ✅ IMPLEMENTED
- Primary: **Kubidu Green (#16A34A)** - 100% green energy = green brand
- Hover: Leaf Light (#22C55E)
- Dark: Deep Forest (#0A1F0A)
- Success: Trust Teal (#0D9488)
- Alert: Amber/Red for warnings/errors

### Tone of Voice
- Confident but not arrogant
- Technical but approachable
- GDPR compliance as a feature, not a burden

---

## 📅 Sprint Plan

### Today (Day 1)
1. ✅ Railway research & MVP scoping
2. 🔄 Docker environment up & functional
3. 🔄 End-to-end flow test
4. 🔲 Fix critical blockers
5. 🔲 Start UI polish

### Day 2-3
- Implement missing P0 features
- Build/runtime logs streaming
- Onboarding flow

### Day 4-5
- Custom domains
- Scaling UI
- Error handling polish

### Day 6-7
- Landing page
- Documentation
- Final testing
- Soft launch prep

---

## 🏆 Success Criteria

MVP is ready when:
1. A new user can sign up and deploy their first app in < 5 minutes
2. The deployed app is accessible via HTTPS
3. Users can view logs and debug issues
4. Environment variables work correctly
5. No critical bugs in the deployment pipeline
6. Basic error handling (no blank screens)

---

*Let's build this! 🚀*
