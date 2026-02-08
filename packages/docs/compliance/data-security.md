# Data Security

How Kubidu protects your data at every layer.

## Security Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Application                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Runtime     │  │ Networking  │  │ Storage     │         │
│  │ Isolation   │  │ Security    │  │ Encryption  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                    Kubidu Platform                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Physical    │  │ Network     │  │ Access      │         │
│  │ Security    │  │ Security    │  │ Control     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                   Data Center (Hetzner)                     │
└─────────────────────────────────────────────────────────────┘
```

## Encryption

### Encryption in Transit

All data in transit is encrypted:

| Connection | Protocol | Cipher |
|------------|----------|--------|
| HTTPS | TLS 1.3 | AES-256-GCM |
| Internal services | mTLS | AES-256-GCM |
| Database | TLS 1.2+ | AES-256-GCM |
| Storage | TLS 1.2+ | AES-256-GCM |

### Encryption at Rest

All stored data is encrypted:

| Data Type | Algorithm | Key Management |
|-----------|-----------|----------------|
| Database | AES-256 | Automated rotation |
| Backups | AES-256 | Separate keys |
| Secrets | AES-256-GCM | Per-workspace keys |
| Container images | AES-256 | Registry keys |

### Key Management

- Keys are stored in hardware security modules (HSMs)
- Automatic key rotation every 90 days
- Separate keys per customer workspace
- Key access is logged and audited

## Network Security

### Isolation

Each customer gets:

- Isolated container runtime
- Private network namespace
- Dedicated egress IP (optional)

### Firewall

Default deny-all policy with explicit allowlists:

```
┌─────────────────────────────────────────────┐
│                   Internet                   │
│                      │                       │
│                      ▼                       │
│              ┌───────────────┐               │
│              │   WAF/DDoS    │               │
│              │   Protection  │               │
│              └───────────────┘               │
│                      │                       │
│                      ▼                       │
│              ┌───────────────┐               │
│              │   Load        │               │
│              │   Balancer    │               │
│              └───────────────┘               │
│                      │                       │
│         ┌────────────┼────────────┐          │
│         ▼            ▼            ▼          │
│    ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│    │  App A  │  │  App B  │  │  App C  │    │
│    │(isolated)│  │(isolated)│  │(isolated)│   │
│    └─────────┘  └─────────┘  └─────────┘    │
└─────────────────────────────────────────────┘
```

### DDoS Protection

- Layer 3/4 DDoS mitigation
- Layer 7 WAF with managed rules
- Rate limiting per IP/endpoint
- Automatic attack detection and response

### Private Networking

Connect apps privately without internet exposure:

```json
{
  "networking": {
    "private": true,
    "allowedApps": ["api", "worker"]
  }
}
```

## Access Control

### Authentication

| Method | Description |
|--------|-------------|
| Password | Minimum 12 characters, complexity requirements |
| MFA | TOTP, WebAuthn, SMS (discouraged) |
| SSO | SAML 2.0, OIDC |

### Authorization

Role-based access control (RBAC):

```
Owner
  ├── Admin
  │     ├── Developer
  │     │     └── Viewer
  │     └── Viewer
  └── Billing Admin
```

See [Permissions](/teams/permissions) for details.

### Session Management

- Session timeout: 24 hours
- Concurrent session limit: 10
- Session revocation on password change
- IP-based session validation (optional)

## Secrets Management

### How Secrets Are Protected

1. **Encrypted** — AES-256-GCM before storage
2. **Isolated** — Per-workspace encryption keys
3. **Access-controlled** — Only admins can view values
4. **Audited** — All access is logged
5. **Injected at runtime** — Never stored in images

### Secret Rotation

Rotate secrets without downtime:

```bash
kubidu secrets rotate DATABASE_PASSWORD
```

Kubidu:
1. Generates new secret
2. Updates running containers
3. Maintains old value briefly for graceful transition
4. Removes old value

## Container Security

### Runtime Isolation

Each container runs with:

- Read-only root filesystem
- No root access
- Resource limits (CPU, memory)
- Network isolation
- Seccomp profiles

### Image Security

- Image scanning for vulnerabilities
- Base image updates
- Signed images only (optional)
- Private registry isolation

### Vulnerability Scanning

Continuous scanning for:

| Type | Frequency | Action |
|------|-----------|--------|
| OS vulnerabilities | Daily | Alert + Auto-patch |
| Library vulnerabilities | On build | Block if critical |
| Container misconfigurations | On deploy | Warning or block |

## Audit Logging

### What's Logged

| Event | Details Captured |
|-------|------------------|
| Authentication | User, IP, success/failure, MFA used |
| Authorization | Resource, action, allowed/denied |
| Data access | Who accessed what, when |
| Configuration changes | What changed, by whom |
| Deployments | Who deployed, what version |

### Log Retention

| Log Type | Retention | Export |
|----------|-----------|--------|
| Audit logs | 1 year | Yes |
| Security events | 2 years | Yes |
| Access logs | 90 days | Yes |

### Log Protection

- Immutable storage
- Tamper detection
- Encrypted at rest
- Access controlled

## Incident Response

### Response Process

1. **Detection** — Automated monitoring alerts
2. **Triage** — Security team assesses severity
3. **Containment** — Isolate affected systems
4. **Eradication** — Remove threat
5. **Recovery** — Restore services
6. **Lessons Learned** — Post-incident review

### Response Times

| Severity | Response Time | Update Frequency |
|----------|---------------|------------------|
| Critical | 15 minutes | Every 30 minutes |
| High | 1 hour | Every 2 hours |
| Medium | 4 hours | Daily |
| Low | 24 hours | Weekly |

### Breach Notification

- Customer notification: Within 24 hours
- Regulatory notification: Within 72 hours (where required)
- Public disclosure: As appropriate

## Physical Security

### Data Center Security

Our data centers (Hetzner, Germany) feature:

- 24/7 security personnel
- Biometric access controls
- CCTV monitoring
- Mantrap entry systems
- Visitor logging

### Environmental Controls

- Redundant power (UPS + generators)
- N+1 cooling
- Fire suppression
- Water damage protection
- Seismic considerations

## Compliance Status

| Standard | Status |
|----------|--------|
| ISO 27001 | ✅ Certified |
| SOC 2 Type II | ✅ Certified |
| GDPR | ✅ Compliant |
| CCPA | ✅ Compliant |

## Security Testing

### Regular Testing

| Test Type | Frequency |
|-----------|-----------|
| Vulnerability scanning | Daily |
| Penetration testing | Quarterly |
| Red team exercises | Annually |
| Social engineering tests | Semi-annually |

### Bug Bounty

We run a bug bounty program for security researchers:

- [security.kubidu.io/bounty](https://security.kubidu.io/bounty)
- Rewards up to €10,000
- Safe harbor policy

## Report a Security Issue

Found a vulnerability?

- Email: security@kubidu.io
- PGP Key: [security.kubidu.io/pgp](https://security.kubidu.io/pgp)
- Response: Within 24 hours

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested remediation
