# GDPR Compliance

How Kubidu ensures GDPR compliance for you and your users.

## Overview

Kubidu is fully compliant with the General Data Protection Regulation (GDPR). This document explains our data practices and how we help you maintain compliance.

## Kubidu as Data Processor

When you use Kubidu, we act as a **Data Processor** under GDPR:

- **You** are the Data Controller for your application's data
- **Kubidu** is the Data Processor, handling data on your behalf

### Data Processing Agreement (DPA)

We offer a standard DPA for all customers. Enterprise customers can request custom terms.

[Download DPA](https://app.kubidu.dev/legal/dpa)

## Data We Process

### Customer Account Data

| Data | Purpose | Retention |
|------|---------|-----------|
| Email | Authentication, communication | Account lifetime |
| Name | Account identification | Account lifetime |
| Password (hashed) | Authentication | Account lifetime |
| IP addresses | Security, logging | 90 days |
| Payment info | Billing (via Stripe) | Account lifetime |

### Application Data

| Data | Purpose | Retention |
|------|---------|-----------|
| Source code | Build & deploy | 30 days |
| Container images | Deployment | 90 days |
| Environment variables | Runtime config | Until deleted |
| Logs | Monitoring | Plan-dependent |
| Metrics | Monitoring | 30 days |

### No Access to Your Users' Data

Kubidu does **not** access, process, or store your end users' data unless explicitly included in logs you generate.

## Data Location

### Primary Regions

| Region | Location | Data Center |
|--------|----------|-------------|
| EU Central | Frankfurt, Germany | Hetzner |
| EU West | Amsterdam, Netherlands | Hetzner |
| US East | Virginia, USA | AWS |

### Data Residency

You can choose where your data is stored:

```yaml
# kubidu.yaml
region: eu-central-1    # Data stays in EU
```

For EU-only data residency, select EU regions only.

## Security Measures

### Encryption

- **In Transit**: TLS 1.3 for all connections
- **At Rest**: AES-256-GCM encryption
- **Secrets**: Additional encryption with per-project keys

### Access Control

- Role-based access (RBAC)
- Multi-factor authentication available
- SSO integration (SAML, OIDC)
- Audit logging for all access

### Infrastructure Security

- ISO 27001 certified data centers
- Regular security audits
- Penetration testing
- DDoS protection

## User Rights

### Data Subject Access Request (DSAR)

Users can request their data:

```bash
# Export all your data
kubidu account export

# Download includes:
# - Account information
# - Project configurations
# - Billing history
# - Audit logs
```

### Right to Erasure

Delete your account and all data:

```bash
kubidu account delete

# This permanently deletes:
# ✗ All projects and services
# ✗ All environment variables and secrets
# ✗ All logs and metrics
# ✗ All billing information
# ✗ Your account
```

Or via Dashboard:
1. Go to **Settings → Account**
2. Click **Delete Account**
3. Confirm deletion

### Data Portability

Export data in machine-readable format:

```bash
kubidu account export --format json
kubidu account export --format csv
```

## Your Compliance Responsibilities

As the Data Controller, you're responsible for:

### 1. Your End Users' Data

- Obtain proper consent
- Handle DSARs for your users
- Implement data minimization
- Provide privacy policies

### 2. Log Content

Ensure your application logs don't contain:
- Passwords
- Personal data without necessity
- Credit card numbers
- Health information

### 3. Environment Variables

Don't store GDPR-relevant data in environment variables unnecessarily.

## Sub-Processors

Kubidu uses the following sub-processors:

| Processor | Purpose | Location |
|-----------|---------|----------|
| Hetzner | Cloud infrastructure | Germany |
| AWS | Cloud infrastructure | USA (EU available) |
| Stripe | Payment processing | USA (EU data in EU) |
| SendGrid | Transactional email | USA |
| Sentry | Error tracking | USA |

We notify customers of sub-processor changes 30 days in advance.

## Incident Response

### Data Breach Notification

In case of a personal data breach:

1. **Detection**: Automated monitoring + manual review
2. **Assessment**: Determine scope and impact
3. **Notification**: Within 72 hours to affected customers
4. **Remediation**: Implement fixes and preventive measures

### Contact

For data protection inquiries:

- **Email**: privacy@kubidu.dev
- **DPO**: dpo@kubidu.dev
- **Address**: Kubidu GmbH, Berlin, Germany

## Best Practices for Your Apps

### 1. Minimize Data Collection

```javascript
// ❌ Don't log full request bodies
logger.info('Request', { body: req.body });

// ✅ Log only necessary info
logger.info('Request', { path: req.path, method: req.method });
```

### 2. Implement Data Retention

```javascript
// Automatically delete old data
await db.users.deleteMany({
  lastActive: { $lt: twoYearsAgo }
});
```

### 3. Handle DSARs

```javascript
// Export user data
app.get('/api/user/export', async (req, res) => {
  const data = await exportUserData(req.userId);
  res.json(data);
});

// Delete user data
app.delete('/api/user', async (req, res) => {
  await deleteAllUserData(req.userId);
  res.status(204).end();
});
```

### 4. Cookie Consent

```javascript
// Only set cookies after consent
if (user.hasConsented) {
  res.cookie('analytics', trackingId);
}
```

## Audit Log

### Access Your Audit Log

```bash
kubidu audit-log

# TIMESTAMP            USER          ACTION         RESOURCE
# ──────────────────────────────────────────────────────────
# 2024-01-15 12:00:00  admin@...    login          account
# 2024-01-15 12:05:00  admin@...    env.set        service
# 2024-01-15 12:10:00  admin@...    deploy         service
```

### Retain Audit Logs

- **Free/Hobby**: 30 days
- **Pro**: 1 year
- **Enterprise**: Custom (up to 7 years)

## Certifications & Attestations

- **ISO 27001:2022** certified
- **SOC 2 Type II** audited
- **GDPR** compliant
- **DPA** available

## Resources

- [Data Processing Agreement](https://kubidu.dev/legal/dpa)
- [Privacy Policy](https://kubidu.dev/privacy)
- [Terms of Service](https://kubidu.dev/terms)
- [Security Whitepaper](https://kubidu.dev/security)

## See Also

- [ISO 27001 Compliance](./iso27001.md)
- [Teams & Access Control](../guides/teams.md)
