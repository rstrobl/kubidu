# GDPR Compliance

Kubidu is designed for GDPR compliance from the ground up. This page explains how Kubidu helps you stay compliant and your responsibilities as a data controller.

## Overview

The General Data Protection Regulation (GDPR) is the EU's data protection law. It applies to:

- Companies in the EU
- Companies processing EU citizens' data
- Anyone handling personal data in the EU

Kubidu provides the infrastructure and tools to help you comply, but you remain responsible for how you use them.

## Your Role vs Kubidu's Role

| Role | Entity | Responsibilities |
|------|--------|-----------------|
| **Data Controller** | You (the customer) | Decide what data to collect, how to use it, respond to user requests |
| **Data Processor** | Kubidu | Process data on your behalf, maintain security, follow your instructions |

## Data Processing Agreement

Kubidu provides a DPA that covers:

- Types of data processed
- Processing purposes
- Security measures
- Subprocessor list
- Breach notification procedures

📄 [Download our DPA](https://kubidu.io/legal/dpa)

Sign via dashboard: Settings → Legal → Data Processing Agreement

## Data Residency

### EU-Only Data Storage

All Kubidu data is stored in EU data centers:

| Location | Provider | Certification |
|----------|----------|---------------|
| Frankfurt, Germany | Hetzner | ISO 27001 |
| Amsterdam, Netherlands | Hetzner | ISO 27001 |

Your application data never leaves the EU unless you explicitly configure it.

### Choosing Your Region

```bash
kubidu workspace settings set region eu-central-1
```

Available EU regions:
- `eu-central-1` — Frankfurt (default)
- `eu-west-1` — Amsterdam

## Key GDPR Features

### 1. Right to Access (Article 15)

Export all data about a user:

```bash
kubidu gdpr export --user user@example.com
```

API:
```bash
curl -X POST https://api.kubidu.io/v1/gdpr/export \
  -H "Authorization: Bearer $KUBIDU_TOKEN" \
  -d '{"email": "user@example.com"}'
```

### 2. Right to Erasure (Article 17)

Delete all data about a user:

```bash
kubidu gdpr delete --user user@example.com
```

This deletes:
- User account
- Associated data
- Audit log entries (anonymized)
- Backups (within 30 days)

### 3. Right to Portability (Article 20)

Export data in machine-readable format:

```bash
kubidu gdpr export --user user@example.com --format json
```

Formats available: JSON, CSV

### 4. Breach Notification (Article 33)

Kubidu notifies you within 24 hours of discovering a breach:

1. Email to workspace owners
2. Dashboard notification
3. Status page update

Configure notification channels:
```bash
kubidu settings notifications add \
  --type security \
  --channel email \
  --address security@yourcompany.com
```

## Data Minimization

Kubidu helps you collect only what's needed:

### Log Redaction

Automatically redact sensitive data in logs:

```json
{
  "logging": {
    "redact": [
      "password",
      "credit_card",
      "email",
      "ip_address"
    ]
  }
}
```

### Retention Policies

Set how long data is kept:

```json
{
  "retention": {
    "logs": "30d",
    "metrics": "90d",
    "backups": "7d"
  }
}
```

## Consent Management

While Kubidu doesn't manage end-user consent (that's your responsibility), we provide tools to integrate:

### Consent API Integration

```javascript
// Your app code
app.post('/consent', async (req, res) => {
  const { userId, consent } = req.body;
  
  await kubidu.users.setConsent(userId, {
    marketing: consent.marketing,
    analytics: consent.analytics,
    timestamp: new Date()
  });
});
```

### Cookie Consent

For Kubidu dashboard cookies:

| Cookie | Purpose | Retention |
|--------|---------|-----------|
| `kb_session` | Authentication | Session |
| `kb_preferences` | User preferences | 1 year |

We don't use third-party tracking cookies.

## Subprocessors

Kubidu uses these subprocessors:

| Provider | Purpose | Location |
|----------|---------|----------|
| Hetzner | Infrastructure | Germany |
| Stripe | Payments | EU/US* |
| Postmark | Email | EU/US* |

*Standard Contractual Clauses in place

Full list: [kubidu.io/legal/subprocessors](https://kubidu.io/legal/subprocessors)

Subscribe to changes:
```bash
kubidu settings notifications add --type subprocessors
```

## Security Measures

### Technical Measures

- ✅ Encryption at rest (AES-256)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Access logging
- ✅ Regular security audits
- ✅ Penetration testing

### Organizational Measures

- ✅ Employee background checks
- ✅ Security training
- ✅ Access control policies
- ✅ Incident response procedures

See [Data Security](/compliance/data-security) for details.

## Your Responsibilities

### You Must:

1. **Get consent** — Collect proper consent from your users
2. **Privacy policy** — Maintain a privacy policy that mentions Kubidu as a processor
3. **DPA** — Sign our Data Processing Agreement
4. **User requests** — Handle data subject requests from your users
5. **Breach response** — Report breaches to authorities within 72 hours

### Checklist

```markdown
- [ ] Sign Kubidu DPA
- [ ] Update privacy policy
- [ ] Implement consent collection
- [ ] Set up data export/deletion endpoints
- [ ] Configure breach notification contacts
- [ ] Set appropriate retention periods
- [ ] Document processing activities
```

## Helpful Resources

- 📄 [Data Processing Agreement](https://kubidu.io/legal/dpa)
- 📄 [Privacy Policy](https://kubidu.io/legal/privacy)
- 📄 [Subprocessor List](https://kubidu.io/legal/subprocessors)
- 📧 [privacy@kubidu.io](mailto:privacy@kubidu.io) — For GDPR inquiries

## Need Help?

For GDPR questions:
- Email: privacy@kubidu.io
- Enterprise customers: Your dedicated account manager
