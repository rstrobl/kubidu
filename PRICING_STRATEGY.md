# Kubidu Pricing Strategy

## Pricing-Analyse & Strategie-Empfehlung
**Erstellt:** 09.02.2026  
**Autor:** Kubidu Product Manager (AI)

---

## 1. Railway.app Benchmark-Analyse

### Railway Pricing-Struktur (Stand Feb 2026)

| Tier | Basis | Credits inkl. | vCPU | RAM | Storage |
|------|-------|--------------|------|-----|---------|
| **Free Trial** | 30 Tage → dann $1/mo | $5 einmalig | 1 | 0.5 GB | 0.5 GB |
| **Hobby** | $5/mo | $5/mo | 48 | 48 GB | 5 GB |
| **Pro** | $20/mo | $20/mo | 1,000 | 1 TB | 1 TB |
| **Enterprise** | Custom | Custom | Custom | Custom | Custom |

### Railway Usage-Based Preise
- **Memory:** $0.00000386 per GB/sec (~$10/GB/mo)
- **CPU:** $0.00000772 per vCPU/sec (~$20/vCPU/mo)
- **Volumes:** $0.00000006 per GB/sec (~$0.16/GB/mo)
- **Egress:** $0.05/GB

### Railway Insights
✅ **Stärken:**
- Usage-Based = nur zahlen was man nutzt
- Credits-System reduziert Einstiegshürde
- Hobby-Tier bei nur $5/mo = extrem niedrig
- Klare Ressourcen-Limits pro Tier

❌ **Schwächen:**
- Kein explizites Student-Tier
- Kein Green Energy USP
- Enterprise ab $200/mo für erweiterte Features

---

## 2. Aktueller Kubidu Zustand

### Problem: Inkonsistenz zwischen Seiten!

**Landing.tsx (USD):**
- Free: $0
- Starter: $29
- Pro: $99
- Enterprise: Custom

**Billing.tsx (EUR):**
- Free: €0
- Starter: €9
- Pro: €29
- Enterprise: €99

⚠️ **KRITISCH:** Massive Preisunterschiede und Währungsmix!

---

## 3. Neue Pricing-Empfehlung

### Strategie: "Green Cloud for Everyone"

Kubidu positioniert sich als **nachhaltige Alternative** mit europäischem Datenschutz. Die Preise orientieren sich an Railway, aber mit klarem Green-Premium und EUR-Fokus für den EU-Markt.

### Tier-Struktur

| Tier | Preis | Zielgruppe | USP |
|------|-------|-----------|-----|
| **🌱 Hobby** | €0/mo | Studenten, Lerner | Einstieg ohne Risiko |
| **🚀 Pro** | €5/mo | Indie Devs, Side Projects | Railway-kompetitiv |
| **👥 Team** | €20/mo | Startups, kleine Teams | Collaboration + Support |
| **🏢 Enterprise** | Custom | Große Firmen | Compliance + SLA |

### Detail-Spezifikationen

#### 🌱 Hobby (€0/mo) - "Green Starter"
**Zielgruppe:** Studenten, Hobbyisten, erste Experimente

| Feature | Limit |
|---------|-------|
| Projekte | Unbegrenzt |
| Services | Unbegrenzt |
| vCPU pro Service | 8 |
| RAM pro Service | 8 GB |
| Storage | 1 GB |
| Build Minutes/mo | 100 |
| Bandwidth/mo | 5 GB |
| Custom Domains | 1 |
| Support | Community |
| **🌱 Green Energy** | ✅ Inklusive |

**Rationale:** Komplett kostenlos wie Railway Trial, aber dauerhaft. Usage-based Pricing - Kunde zahlt was er nutzt.

---

#### 🚀 Pro (€5/mo) - "Indie Developer"
**Zielgruppe:** Indie Devs, Freelancer, Side Projects

| Feature | Limit |
|---------|-------|
| Projekte | Unbegrenzt |
| Services | Unbegrenzt |
| vCPU pro Service | 32 |
| RAM pro Service | 32 GB |
| Storage | 10 GB |
| Build Minutes/mo | 500 |
| Bandwidth/mo | 50 GB |
| Custom Domains | 5 |
| Support | Email (48h) |
| **🌱 Green Energy** | ✅ Inklusive |
| **CO₂-Dashboard** | ✅ Basis |

**Rationale:** Direkt konkurrenzfähig mit Railway Hobby ($5). Usage-based Pricing - Kunde zahlt was er nutzt.

---

#### 👥 Team (€20/mo pro Seat) - "Startup Growth"
**Zielgruppe:** Startups, kleine Teams (2-10 Personen)

| Feature | Limit |
|---------|-------|
| Projekte | Unbegrenzt |
| Services | Unbegrenzt |
| vCPU pro Service | 32 |
| RAM pro Service | 32 GB |
| Storage | 100 GB |
| Build Minutes/mo | 2,000 |
| Bandwidth/mo | 200 GB |
| Custom Domains | Unbegrenzt |
| Team Members | Unbegrenzt (€20/Seat) |
| Support | Priority (24h) |
| **🌱 Green Energy** | ✅ Inklusive |
| **CO₂-Dashboard** | ✅ Erweitert |
| **Green Badge** | ✅ für Website |
| RBAC | ✅ |
| Audit Logs | 7 Tage |

**Rationale:** Konkurrenzfähig mit Railway Pro ($20). Usage-based Pricing - Kunde zahlt was er nutzt.

---

#### 🏢 Enterprise (Custom) - "Sustainable Scale"
**Zielgruppe:** Große Unternehmen, Konzerne, Behörden

| Feature | Limit |
|---------|-------|
| Alles aus Team | ✅ |
| Ressourcen | Unbegrenzt |
| SSO/SAML | ✅ |
| HIPAA/SOC2 | ✅ |
| SLA | 99.95% |
| Support | Dedicated + Slack |
| Audit Logs | 365 Tage |
| **🌱 Green Certificate** | ✅ Offizielles Zertifikat |
| **ESG Reporting** | ✅ Quartalsberichte |
| On-Premise Option | ✅ |

**Pricing Empfehlung:** Ab €500/mo, je nach Ressourcen

---

## 4. "100% Green Energy" als Premium-Feature

### Differenzierung durch Nachhaltigkeit

Railway und andere Cloud-Anbieter haben **kein explizites Green-Feature**. Kubidu kann sich hier klar differenzieren:

### Green Features pro Tier

| Feature | Hobby | Pro | Team | Enterprise |
|---------|-------|-----|------|------------|
| 100% Green Energy | ✅ | ✅ | ✅ | ✅ |
| CO₂-Tracking Dashboard | ❌ | Basis | Erweitert | Custom |
| "Powered by Green Energy" Badge | ❌ | ❌ | ✅ | ✅ |
| Green Certificate (PDF) | ❌ | ❌ | ❌ | ✅ |
| ESG-Report Integration | ❌ | ❌ | ❌ | ✅ |
| Carbon Offset API | ❌ | ❌ | ❌ | ✅ |

### Marketing-Positioning

> **"Die einzige Cloud, die gut für dein Business UND den Planeten ist."**

- Jedes Deployment zeigt gesparte CO₂-Menge
- Monatliche Green-Reports per Email
- Badge für Websites: "Hosted Green on Kubidu"
- Für Enterprise: Offizielle Zertifikate für ESG-Reporting

---

## 5. Wettbewerbsvergleich

| Anbieter | Cheapest Paid | Pro Equivalent | Green USP |
|----------|--------------|----------------|-----------|
| Railway | $5/mo | $20/mo | ❌ Nein |
| Render | $7/mo | $25/mo | ❌ Nein |
| Fly.io | $5/mo | Usage-based | ❌ Nein |
| Heroku | $5/mo | $25/mo | ❌ Nein |
| **Kubidu** | **€5/mo** | **€20/mo** | **✅ 100% Green** |

**Fazit:** Kubidu ist preislich konkurrenzfähig UND hat einen klaren USP.

---

## 6. Implementierungs-Empfehlungen

### Sofort umsetzen:
1. ✅ Einheitliche Währung (EUR) auf allen Seiten
2. ✅ Neue 4-Tier-Struktur: Hobby → Pro → Team → Enterprise
3. ✅ Green-Badges und CO₂-Tracking prominent zeigen
4. ✅ 20% Rabatt bei jährlicher Zahlung (wie aktuell)

### Mittelfristig (Q2 2026):
- Usage-Based Pricing als Option (wie Railway)
- Student-Verifizierung für Hobby-Tier (z.B. GitHub Education)
- Green Certificate Generator für Enterprise

### Langfristig (Q3+ 2026):
- Carbon Offset Marketplace
- ESG API für Enterprise-Kunden
- "Net Zero" Zertifizierung

---

## 7. Revenue-Projektion

### Annahmen (konservativ):
- 1000 Hobby User → €0 = €0
- 200 Pro User → €5 = €1,000/mo
- 50 Team User (avg 3 seats) → €3,000/mo
- 5 Enterprise → €5,000/mo

**Monatlicher Umsatz:** ~€9,000/mo = **€108,000/Jahr**

### Mit Usage-Based (optimistisch):
- Overage Fees könnten +30% bringen
- **Potenzial:** €140,000/Jahr

---

## Zusammenfassung

| Tier | Preis | Projekte/Services | vCPU/RAM pro Service |
|------|-------|-------------------|---------------------|
| Hobby | €0 | **Unbegrenzt** | 8 vCPU / 8 GB RAM |
| Pro | €5/mo | **Unbegrenzt** | 32 vCPU / 32 GB RAM |
| Team | €20/mo/Seat | **Unbegrenzt** | 32 vCPU / 32 GB RAM |
| Enterprise | Custom | **Unbegrenzt** | **Unlimited** |

**Key Insights:**
- **Keine Projekt/Service-Limits** mehr → wie Railway, maximale Flexibilität
- **Usage-based Pricing** → Kunde zahlt nur was er tatsächlich nutzt
- **Ressourcen-Limits pro Service** orientieren sich an Railway (Hobby: 8/8, Pro+: 32/32)
- Mit €5/mo Pro-Tier wird Kubidu direkt kompetitiv mit Railway, behält aber den Green-USP.

---

*Erstellt vom Kubidu PM Agent | Nächster Review: Q2 2026*
