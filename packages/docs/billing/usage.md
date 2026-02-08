# Usage & Billing

Track your resource usage and manage billing.

## Viewing Usage

### Dashboard

View usage in the [Kubidu Dashboard](https://app.kubidu.io):

1. Go to Settings → Billing
2. Click "Usage" tab

### CLI

```bash
kubidu billing usage
```

```
┌────────────────────────────────────────────────────────────┐
│ Usage Summary (January 2024)                               │
├────────────────────────────────────────────────────────────┤
│ Compute                                                    │
│   CPU Hours:        1,234 hrs     │ €61.70               │
│   Memory Hours:     2,468 GB-hrs  │ €24.68               │
│                                                            │
│ Deployments                                                │
│   Build Minutes:    456 min       │ Included             │
│   Deploys:          89            │ Included             │
│                                                            │
│ Networking                                                 │
│   Bandwidth Out:    45.2 GB       │ €4.52                │
│                                                            │
│ Storage                                                    │
│   Container Images: 12.3 GB       │ Included             │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ Total:              €90.90                                 │
│ Plan:               Team (€99/mo)                          │
│ Credits Applied:    -€90.90                                │
│ Due:                €0.00                                  │
└────────────────────────────────────────────────────────────┘
```

## Usage Pricing

### Compute

| Resource | Price |
|----------|-------|
| vCPU | €0.05/hour |
| Memory | €0.01/GB-hour |
| GPU (T4) | €0.50/hour |

Example: 1 vCPU + 2 GB RAM running 24/7 for a month:
- CPU: 1 × €0.05 × 730 hrs = €36.50
- Memory: 2 × €0.01 × 730 hrs = €14.60
- **Total: €51.10/month**

### Networking

| Resource | Free Tier | Price |
|----------|-----------|-------|
| Bandwidth In | Unlimited | Free |
| Bandwidth Out | 100 GB/mo | €0.10/GB |

### Storage

| Resource | Included | Price |
|----------|----------|-------|
| Container images | 10 GB | €0.05/GB-month |
| Logs | Per plan | N/A |

### Build Minutes

| Plan | Included | Extra |
|------|----------|-------|
| Free | 100/mo | N/A |
| Pro | 500/mo | €0.02/min |
| Team | 2000/mo | €0.01/min |

## Understanding Your Bill

### Invoice Breakdown

```
Kubidu Invoice - January 2024
───────────────────────────────────────────────────────
Plan: Team                                      €99.00

Usage charges:
  my-app (1 vCPU, 2GB, 730 hrs)                €51.10
  api (0.5 vCPU, 1GB, 730 hrs)                 €25.55
  worker (2 vCPU, 4GB, 200 hrs)                €18.00

Networking:
  Bandwidth overage (45 GB)                      €4.50

Add-ons:
  Priority support                             €50.00

───────────────────────────────────────────────────────
Subtotal                                      €248.15
Credits applied                               -€99.00
───────────────────────────────────────────────────────
Total due                                     €149.15
```

### How Plan Credits Work

Your plan includes a credit each month:

| Plan | Monthly Credit |
|------|----------------|
| Pro | €29 |
| Team | €99 |
| Enterprise | Custom |

Credits apply to usage charges first. Unused credits don't roll over.

## Managing Costs

### Set Budget Alerts

```bash
kubidu billing alerts set --budget 200 --threshold 80
```

Get notified at 80% of €200 budget.

### View Cost by App

```bash
kubidu billing usage --by-app
```

```
APP         CPU       MEMORY    NETWORK   TOTAL
my-app      €36.50    €14.60    €2.30     €53.40
api         €18.25    €7.30     €1.50     €27.05
worker      €7.30     €2.92     €0.50     €10.72
───────────────────────────────────────────────
Total                                     €91.17
```

### Cost Optimization Tips

1. **Right-size resources**
   ```bash
   kubidu recommend resources
   ```

2. **Use auto-scaling**
   Scale down during low traffic

3. **Schedule non-production**
   ```bash
   kubidu schedule stop --cron "0 20 * * *" --env staging
   ```

4. **Clean up unused apps**
   ```bash
   kubidu apps list --idle 30d
   ```

## Payment Methods

### Supported Methods

- Credit/debit cards (Visa, Mastercard, Amex)
- SEPA Direct Debit (EU)
- Bank transfer (annual plans only)
- PayPal

### Add Payment Method

```bash
kubidu billing payment add
```

Or in Dashboard: Settings → Billing → Payment Methods

### Update Payment Method

```bash
kubidu billing payment update
```

## Invoices

### View Invoices

```bash
kubidu billing invoices
```

```
DATE          AMOUNT    STATUS     INVOICE
2024-01-01    €149.15   Paid       INV-2024-001
2023-12-01    €112.30   Paid       INV-2023-012
2023-11-01    €99.00    Paid       INV-2023-011
```

### Download Invoice

```bash
kubidu billing invoices download INV-2024-001
```

### Invoice Settings

Set your billing details:

```bash
kubidu billing settings set --company "ACME GmbH" \
  --vat DE123456789 \
  --address "Hauptstraße 1, 10115 Berlin"
```

## Credits

### View Credits

```bash
kubidu billing credits
```

```
TYPE            AMOUNT    EXPIRES      SOURCE
Plan credit     €99.00    2024-01-31   Team plan
Promo credit    €50.00    2024-03-31   WELCOME50
───────────────────────────────────────────────
Total available: €149.00
```

### Redeem Promo Code

```bash
kubidu billing credits redeem PROMO2024
```

### Credit Priority

Credits are applied in this order:
1. Expiring soonest first
2. Promotional credits
3. Plan credits

## Billing Cycle

- Billing occurs on the 1st of each month
- Usage is calculated from the previous month
- Payment is due within 14 days
- Failed payments trigger email reminders

### Change Billing Date

Enterprise customers can request custom billing dates. Contact sales@kubidu.io.

## Tax Information

### VAT

- EU customers: VAT charged based on country
- Reverse charge: Available for EU B2B customers
- Non-EU: No VAT charged

Add your VAT ID:
```bash
kubidu billing settings set --vat DE123456789
```

### Tax Invoices

All invoices are valid tax invoices including:
- Kubidu GmbH details
- Your company details
- VAT breakdown (where applicable)

## Cancellation

### Downgrade Plan

```bash
kubidu billing downgrade free
```

Takes effect at end of billing cycle.

### Cancel Account

```bash
kubidu billing cancel
```

::: warning
Cancellation deletes all your data after 30 days. Export first:
```bash
kubidu export --all
```
:::

## FAQ

### When am I charged?

On the 1st of each month for the previous month's usage plus your plan fee.

### Can I get a refund?

- 14-day money-back guarantee on first payment
- Prorated refunds on annual plans
- No refunds on usage charges

### What if my payment fails?

- 3 retry attempts over 7 days
- Email notifications after each failure
- Services suspended after 14 days
- Data deleted after 30 days

### Do unused resources cost money?

Yes, if they're running. Use auto-scaling or schedules to stop unused resources:

```bash
kubidu scale 0 --app unused-app
```
