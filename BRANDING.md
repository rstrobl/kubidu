# Kubidu Brand Guidelines

## Brand Identity

### Name
**Kubidu** (pronounced: koo-BEE-doo)
- A playful blend of "Kubernetes" and "can-do" energy
- Easy to remember, easy to spell, globally neutral
- Domain: kubidu.io

### Tagline
**Primary:** "Deploy with confidence. Stay compliant."
**Alternatives:**
- "Green. Compliant. Developer-first."
- "100% renewable. 100% EU. 100% yours."
- "Sustainable cloud for the modern web."

### Unique Selling Points
1. **100% Green Energy** - Powered entirely by renewable energy sources
2. **EU-Hosted** - Data stays in Frankfurt, Germany
3. **GDPR by Default** - Privacy-first architecture
4. **Developer-First** - Deploy Docker apps in minutes

---

## Color Palette

### Primary Colors
| Color | Hex | Usage |
|-------|-----|-------|
| **Kubidu Green** | `#16A34A` | Primary brand color, CTAs, links — reflects 100% green energy |
| **Deep Forest** | `#0A1F0A` | Headers, important text, dark backgrounds |
| **Cloud White** | `#FFFFFF` | Backgrounds, contrast |

### Secondary Colors
| Color | Hex | Usage |
|-------|-----|-------|
| **Leaf Light** | `#22C55E` | Hover states, highlights |
| **Trust Teal** | `#0D9488` | Success states, security badges |
| **Sunset Orange** | `#F97316` | Warnings, highlights, energy accents |
| **Soft Gray** | `#F8FAFC` | Subtle backgrounds, cards |
| **Slate** | `#64748B` | Secondary text, icons |

### Gradient
```css
background: linear-gradient(135deg, #16A34A 0%, #22C55E 100%);
```
Use sparingly for hero sections and premium elements. The green gradient reinforces our sustainability commitment.

### Color Accessibility
- All text combinations meet WCAG AA standards
- Primary blue on white: 4.5:1 contrast ratio
- Dark text on light backgrounds preferred

---

## Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Type Scale
| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 (Hero) | 48-72px | 800 | 1.1 |
| H2 (Section) | 36-48px | 700 | 1.2 |
| H3 (Card Title) | 24px | 600 | 1.3 |
| Body Large | 18px | 400 | 1.6 |
| Body | 16px | 400 | 1.5 |
| Small/Caption | 14px | 400 | 1.4 |
| Code | 14px | 500 (mono) | 1.6 |

### Code Font
```css
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

---

## Logo Concept

### Primary Logo
A stylized "K" formed by:
- Two connected nodes/circles (representing Kubernetes pods/containers)
- Clean geometric lines connecting them
- Suggests connectivity, orchestration, simplicity

### Logo Variations
1. **Full Logo**: Icon + "Kubidu" wordmark
2. **Icon Only**: For favicons, app icons, small spaces
3. **Wordmark Only**: When icon isn't needed

### Logo Colors
- Primary: Kubidu Blue (#0066FF) on white
- Inverted: White on dark backgrounds
- Monochrome: Black or white for single-color use

### Clear Space
Minimum clear space = height of the "K" icon around all sides

---

## Tone of Voice

### Personality
Kubidu is:
- **Confident** but not arrogant
- **Technical** but accessible
- **Friendly** but professional
- **European** but globally minded

### Writing Guidelines

**DO:**
- Use "you" and "your" (customer-focused)
- Be direct and clear
- Explain technical concepts simply
- Use active voice
- Celebrate developer wins

**DON'T:**
- Use buzzwords without substance
- Be condescending
- Over-promise
- Use fear-based marketing
- Forget the human behind the keyboard

### Voice Examples

**Hero Copy:**
✅ "Deploy your apps in minutes. Stay GDPR compliant forever."
❌ "Leverage our cutting-edge cloud-native synergies."

**Error Message:**
✅ "Build failed: Dockerfile not found. Make sure it's in your repo root."
❌ "Error 500: Build process terminated unexpectedly."

**Success State:**
✅ "Your app is live! 🚀 Visit it at your-app.kubidu.io"
❌ "Deployment successful. Resource ID: dep_8f3k2j1"

---

## UI Components

### Buttons
```css
/* Primary CTA */
.btn-primary {
  background: #0066FF;
  color: white;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  transition: all 0.2s;
}
.btn-primary:hover {
  background: #0052CC;
  transform: translateY(-1px);
}

/* Secondary */
.btn-secondary {
  background: white;
  color: #0066FF;
  border: 2px solid #0066FF;
}
```

### Cards
- Border radius: 12px
- Shadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1)`
- Border: 1px solid #E2E8F0 (subtle)
- Padding: 24px

### Badges
```css
/* GDPR Badge */
.badge-gdpr {
  background: #ECFDF5;
  color: #059669;
  border: 1px solid #10B981;
}

/* Status Badges */
.badge-running { background: #DCFCE7; color: #16A34A; }
.badge-building { background: #FEF3C7; color: #D97706; }
.badge-failed { background: #FEE2E2; color: #DC2626; }
```

---

## Imagery & Icons

### Icon Style
- Heroicons (outline style) for UI
- Custom icons for features (simple, geometric)
- Consistent 24px size in UI, 48px for features

### Illustrations
- Abstract, geometric shapes
- Blue + teal color palette
- Suggest cloud, connectivity, simplicity
- No literal server racks or people

### Screenshots
- Real product screenshots
- Clean, populated with realistic data
- Highlighted with subtle shadows

---

## Trust Signals

### Compliance Badges
Always display prominently:
- 🌱 100% Green Energy (Renewable Powered)
- 🇪🇺 EU-Hosted (Frankfurt, Germany)
- 🔒 GDPR Compliant (Privacy First)
- 📜 ISO 27001 Ready (Audit Logging)

### Social Proof
- Customer logos (when available)
- GitHub stars
- Developer testimonials
- Deployment counter

---

## Brand Applications

### Website
- Clean, spacious layouts
- Hero with gradient accent
- Trust signals above fold
- Clear pricing

### Documentation
- Left sidebar navigation
- Clean typography
- Syntax highlighting with brand colors
- Searchable

### Email
- Simple, text-focused
- Kubidu blue accents
- Clear CTAs
- Mobile-first

### Social Media
- Consistent avatar (icon)
- Brand colors in graphics
- Technical but approachable content

---

## Quick Reference

```
Kubidu Green:    #16A34A (primary)
Leaf Light:      #22C55E (hover/highlights)
Deep Forest:     #0A1F0A (dark backgrounds)
Trust Teal:      #0D9488 (success/security)
Warning Orange:  #F97316 (warnings)
Soft Gray:       #F8FAFC (backgrounds)
Slate Text:      #64748B (secondary text)

Font: Inter (UI), JetBrains Mono (code)
Border Radius: 8px (buttons), 12px (cards)
```

---

*Last updated: February 2026*
*Version: 1.0*
