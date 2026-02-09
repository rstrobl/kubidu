# Issue #001: HTTPS/SSL Auto-Provisioning

**Priority:** 🔴 P0 (MUST-HAVE)  
**Effort:** 2-3 days  
**Assignee:** TBD  
**Labels:** `security`, `feature`, `blocking`, `infrastructure`

---

## 📋 Summary

Implement automatic SSL certificate provisioning via Let's Encrypt for all custom domains. Without HTTPS, no user can deploy production workloads.

## 🎯 Acceptance Criteria

- [ ] User adds custom domain → SSL certificate is automatically requested
- [ ] Certificate provisioning completes within 5 minutes
- [ ] UI shows certificate status (Pending, Active, Expired, Failed)
- [ ] Certificates auto-renew before expiration (30 days)
- [ ] Failed provisioning shows clear error message
- [ ] Works for both apex domains and subdomains

## 🔧 Technical Implementation

### 1. Install cert-manager in K8s

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### 2. Create ClusterIssuer

```yaml
# infrastructure/k8s/cert-manager/cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@kubidu.dev
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - http01:
        ingress:
          class: nginx
```

### 3. Update Domain Entity

```typescript
// packages/api/prisma/schema.prisma
model Domain {
  // ... existing fields
  sslStatus      SslStatus @default(PENDING)
  sslExpiresAt   DateTime?
  sslError       String?
}

enum SslStatus {
  PENDING
  PROVISIONING
  ACTIVE
  FAILED
  EXPIRED
}
```

### 4. Update Deploy Controller

```typescript
// packages/deploy-controller/src/services/ingress.service.ts

async createIngressWithTls(domain: Domain, namespace: string) {
  const ingress = {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: {
      name: `ingress-${domain.id}`,
      namespace,
      annotations: {
        'kubernetes.io/ingress.class': 'nginx',
        'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
      },
    },
    spec: {
      tls: [{
        hosts: [domain.hostname],
        secretName: `tls-${domain.id}`,
      }],
      rules: [{
        host: domain.hostname,
        http: {
          paths: [{
            path: '/',
            pathType: 'Prefix',
            backend: {
              service: {
                name: `svc-${domain.serviceId}`,
                port: { number: 80 },
              },
            },
          }],
        },
      }],
    },
  };

  await this.k8sNetworkingApi.createNamespacedIngress(namespace, ingress);
}
```

### 5. Certificate Status Watcher

```typescript
// packages/deploy-controller/src/services/certificate-watcher.service.ts

@Injectable()
export class CertificateWatcherService {
  async watchCertificateStatus(domainId: string) {
    const watcher = new Watch(this.kubeConfig);
    
    watcher.watch(
      `/apis/cert-manager.io/v1/namespaces/*/certificates`,
      {},
      (type, cert) => {
        if (cert.status?.conditions) {
          const ready = cert.status.conditions.find(c => c.type === 'Ready');
          if (ready?.status === 'True') {
            this.domainService.updateSslStatus(domainId, 'ACTIVE', cert.status.notAfter);
          } else if (ready?.status === 'False') {
            this.domainService.updateSslStatus(domainId, 'FAILED', null, ready.message);
          }
        }
      },
    );
  }
}
```

### 6. UI Updates

- Add SSL status badge to domain list
- Show "Provisioning SSL..." spinner
- Show certificate expiry date
- Error state with retry button

## 📁 Files to Create/Modify

- [ ] `infrastructure/k8s/cert-manager/cluster-issuer.yaml` (create)
- [ ] `packages/api/prisma/schema.prisma` (add SslStatus)
- [ ] `packages/api/src/modules/domains/domains.service.ts` (add SSL methods)
- [ ] `packages/deploy-controller/src/services/ingress.service.ts` (add TLS)
- [ ] `packages/deploy-controller/src/services/certificate-watcher.service.ts` (create)
- [ ] `packages/web/src/components/domains/DomainCard.tsx` (add SSL badge)

## 🧪 Test Cases

1. Add domain → certificate issued within 5 min
2. Invalid domain → shows FAILED with error message
3. Expiring cert → auto-renewed
4. Delete domain → certificate deleted

## 🚫 Out of Scope

- Wildcard certificates
- Custom CA certificates
- Certificate import

## 📚 References

- [cert-manager docs](https://cert-manager.io/docs/)
- [Let's Encrypt rate limits](https://letsencrypt.org/docs/rate-limits/)
- [Railway SSL docs](https://docs.railway.app/guides/public-networking#ssl)

---

*Created: 2026-02-09*
