# Pricing Plans

Kubidu offers flexible pricing that grows with your needs.

## Plans Overview

| Feature | Free | Pro | Team | Enterprise |
|---------|------|-----|------|------------|
| **Price** | €0 | €29/mo | €99/mo | Custom |
| **Apps** | 3 | 10 | Unlimited | Unlimited |
| **Deployments** | 100/mo | Unlimited | Unlimited | Unlimited |
| **Team Members** | 1 | 3 | 20 | Unlimited |
| **Support** | Community | Email | Priority | Dedicated |

## Free Plan

Perfect for hobby projects and experimentation.

**Includes:**
- 3 apps
- 100 deployments/month
- 512 MB RAM per app
- 0.5 vCPU per app
- Shared subdomain (*.kubidu.io)
- Community support

**Limitations:**
- Apps sleep after 30 min of inactivity
- No custom domains
- No team members
- 24-hour log retention

```bash
# Start free
kubidu signup
```

## Pro Plan — €29/month

For individual developers and small projects.

**Everything in Free, plus:**
- 10 apps
- Unlimited deployments
- 1 GB RAM per app
- 1 vCPU per app
- Custom domains (with SSL)
- 3 team members
- 7-day log retention
- Email support
- No sleep on inactivity

```bash
kubidu billing upgrade pro
```

## Team Plan — €99/month

For growing teams and production workloads.

**Everything in Pro, plus:**
- Unlimited apps
- 4 GB RAM per app
- 2 vCPU per app
- 20 team members
- 30-day log retention
- Priority support
- SSO integration
- Audit logs
- Role-based access control
- Multiple workspaces

```bash
kubidu billing upgrade team
```

## Enterprise Plan

For organizations with advanced needs.

**Everything in Team, plus:**
- Unlimited team members
- Custom resource limits
- 90-day log retention
- Dedicated support
- SLA guarantee (99.9%+)
- Custom contracts
- Volume discounts
- On-premise option
- Compliance reports
- Security reviews

Contact sales: sales@kubidu.io

## Feature Comparison

### Compute & Resources

| Feature | Free | Pro | Team | Enterprise |
|---------|------|-----|------|------------|
| Max RAM per app | 512 MB | 1 GB | 4 GB | Custom |
| Max vCPU per app | 0.5 | 1 | 2 | Custom |
| Max instances | 1 | 3 | 10 | Unlimited |
| Auto-scaling | ❌ | ✅ | ✅ | ✅ |
| GPU instances | ❌ | ❌ | ✅ | ✅ |

### Deployments

| Feature | Free | Pro | Team | Enterprise |
|---------|------|-----|------|------------|
| Deployments/month | 100 | Unlimited | Unlimited | Unlimited |
| Build minutes | 100/mo | 500/mo | 2000/mo | Unlimited |
| Preview deployments | ❌ | ✅ | ✅ | ✅ |
| Rollback history | 5 | 10 | 30 | Unlimited |

### Domains & Networking

| Feature | Free | Pro | Team | Enterprise |
|---------|------|-----|------|------------|
| Custom domains | ❌ | 3 | 20 | Unlimited |
| SSL certificates | ✅ | ✅ | ✅ | ✅ |
| DDoS protection | Basic | Enhanced | Enhanced | Enterprise |
| Dedicated IP | ❌ | ❌ | ✅ | ✅ |

### Team & Collaboration

| Feature | Free | Pro | Team | Enterprise |
|---------|------|-----|------|------------|
| Team members | 1 | 3 | 20 | Unlimited |
| Workspaces | 1 | 5 | 20 | Unlimited |
| Audit logs | ❌ | ❌ | ✅ | ✅ |
| SSO | ❌ | ❌ | ✅ | ✅ |
| Custom roles | ❌ | ❌ | ❌ | ✅ |

### Support

| Feature | Free | Pro | Team | Enterprise |
|---------|------|-----|------|------------|
| Community forum | ✅ | ✅ | ✅ | ✅ |
| Email support | ❌ | ✅ | ✅ | ✅ |
| Priority support | ❌ | ❌ | ✅ | ✅ |
| Dedicated CSM | ❌ | ❌ | ❌ | ✅ |
| SLA | ❌ | ❌ | 99.5% | 99.9%+ |

## Add-Ons

Available on any paid plan:

| Add-On | Price |
|--------|-------|
| Extra team member | €10/mo each |
| Extra GB RAM | €5/mo each |
| Extra vCPU | €10/mo each |
| Extended logs (90 days) | €20/mo |
| Dedicated IP | €15/mo |
| Priority support | €50/mo |

```bash
kubidu billing addons add priority-support
```

## Annual Billing

Save 20% with annual billing:

| Plan | Monthly | Annual | Savings |
|------|---------|--------|---------|
| Pro | €29/mo | €278/yr | €70 |
| Team | €99/mo | €950/yr | €238 |

```bash
kubidu billing upgrade pro --annual
```

## Startup Program

Eligible startups get:

- €5,000 in credits
- 12 months of Team plan
- Direct support

Apply: [kubidu.io/startups](https://kubidu.io/startups)

Requirements:
- Less than €1M raised
- Less than 2 years old
- Not a current customer

## Non-Profit Discount

Registered non-profits get 50% off all plans.

Apply: [kubidu.io/nonprofits](https://kubidu.io/nonprofits)

## Education

Students and educators get free Pro access:

- Valid .edu email required
- Renews annually
- Includes all Pro features

Apply: [kubidu.io/education](https://kubidu.io/education)

## FAQ

### Can I change plans anytime?

Yes! Upgrade or downgrade at any time:
- Upgrades take effect immediately
- Downgrades take effect at next billing cycle
- No lock-in contracts

### What happens if I exceed limits?

- We'll notify you before any limits are hit
- Services continue running (no sudden shutdowns)
- You can upgrade or reduce usage
- Enterprise plans have no hard limits

### Do you offer refunds?

- 14-day money-back guarantee on first purchase
- Prorated refunds on annual plans
- No refunds on usage-based charges

### Is there a free trial?

The Free plan is unlimited time! For Pro/Team features:
- 14-day free trial available
- No credit card required to start
- Full access to all features during trial
