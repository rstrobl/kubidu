# i18n Audit Report - Kubidu Dashboard

**Erstellt:** 2026-02-09  
**Status:** i18n-System vorhanden (react-i18next), aber inkonsistent genutzt

---

## Zusammenfassung

- **i18n Setup:** ✅ Vorhanden (`src/i18n/index.ts`)
- **Locale-Dateien:** `de.json` (23KB), `en.json` (22KB)
- **Problem:** Viele Komponenten nutzen `useTranslation` nicht und haben hardcoded englische Strings

---

## Dateien MIT i18n (korrekt)

| Datei | Status |
|-------|--------|
| `pages/Projects.tsx` | ✅ |
| `pages/Dashboard.tsx` | ✅ |
| `pages/Register.tsx` | ✅ |
| `pages/Billing.tsx` | ✅ |
| `pages/Landing.tsx` | ✅ |
| `pages/NewProject.tsx` | ✅ |
| `pages/Settings.tsx` | ✅ |
| `pages/Login.tsx` | ✅ |
| `components/LanguageSwitcher.tsx` | ✅ |
| `components/Layout.tsx` | ✅ |

---

## Dateien OHNE i18n (zu migrieren)

### Hohe Priorität (Nutzer sehen diese häufig)

#### `pages/WorkspaceSettings.tsx`
```
"Workspace updated successfully."
"Failed to update workspace."
"Failed to send invitation."
"Failed to update role."
"Are you sure you want to remove this member?"
"Failed to remove member."
"Failed to cancel invitation."
"Are you sure you want to leave this workspace?"
"Failed to leave workspace."
"Failed to delete workspace."
"Saving..."
"Save Changes"
"Admin" / "Member" / "Deployer"
"email@example.com"
"Sending..." / "Send Invite"
```

#### `pages/ProjectDetail.tsx`
```
"Failed to load project"
"Web App" / "Frontend or full-stack app"
"Database" / "PostgreSQL, Redis, etc."
```

#### `pages/Activity.tsx`
```
"All Activity"
"Deployments"
"Services"
"Domains"
"Environment"
"Team"
"Today" / "Yesterday"
"Failed to fetch activity"
```

#### `components/AddServiceModal.tsx`
```
"Failed to load templates"
"Failed to create service"
"Docker image is required"
"Could not generate service name from the provided information"
"Please select a template"
"Failed to deploy template"
"postgres:14 or registry.com/image:tag"
"Creating..." / "Create Service"
"Deploying..." / "Deploy Template"
```

#### `components/EmptyState.tsx`
```
"No projects yet"
"Create your first project to start deploying services to the cloud."
"Create Project"
"No services in this project"
"Add a service from GitHub or a Docker image to get started."
"Add Service"
"No deployments yet"
"Deploy your service to see it running in the cloud."
"All caught up!"
"You have no notifications at the moment."
"No custom domains"
"Add a custom domain to access your service with your own URL."
"Add Domain"
"No environment variables"
"Add environment variables to configure your service."
"Add Variable"
"No results found"
"Just you here"
"Invite team members to collaborate on projects."
"Invite Member"
```

#### `components/GlobalSearch.tsx`
```
"Search projects, services, deployments..."
"Projects" / "Services" / "Deployments" / "Environments" / "Webhooks"
"Powered by Kubidu Search"
```

### Mittlere Priorität

#### `pages/Insights.tsx`
```
"Production" (Mock-Daten)
"Failed to fetch insights"
```

#### `pages/AuditLogs.tsx`
```
"Failed to load audit logs"
"Demo Browser" / "Demo User"
"System"
"All time" / "All actions" / "All resources"
"Try adjusting your filters"
"Actions will appear here once you start using Kubidu"
```

#### `components/ServiceDetailModal/` (alle Tabs)
```
AutoscalingTab.tsx:
  - "Enabled" / "Disabled"
  - "Saving..."
  - "Save Configuration"

DeploymentsTab.tsx:
  - "Retrying..." / "Retry"
  - "Redeploying..." / "Redeploy"
  - "Loading..." / "View Logs"
  - "No logs available while deployment is pending"

SettingsTab.tsx:
  - "e.g., prefect server start"
  - "Override the container's default command"
  - "Saving..." / "Save Changes"

OverviewTab.tsx:
  - "m" means millicores. 1000m = 1 full CPU core."
  - "Mi" means Mebibytes..."
  - "Gi" means Gibibytes..."
  - "Port" / "Replicas" / "CPU Limit" / "Memory Limit"
  - "Health Check"
  - Tooltips content
```

#### `components/WebhookSettings.tsx`
```
"Production Alerts"
"Used to sign webhook payloads"
"Send test" / "Edit" / "Delete"
```

#### `components/ProjectSettingsModal.tsx`
```
"Project name"
"Description (optional)"
```

### Niedrige Priorität (selten gesehen)

#### `pages/Terms.tsx` & `pages/Privacy.tsx`
- Komplett auf Englisch (rechtliche Texte)
- **Empfehlung:** Separate deutsche Version oder dynamisches Laden basierend auf Locale

#### `pages/NotificationSettings.tsx`
#### `pages/Dependencies.tsx`
#### `pages/StatusPage.tsx`
#### `pages/NewWorkspace.tsx`
#### `pages/ForgotPassword.tsx`
#### `pages/ResetPassword.tsx`
#### `pages/GitHubCallback.tsx`
#### `pages/AuthCallback.tsx`
#### `pages/Impact.tsx`
#### `pages/ProjectLogs.tsx`
#### `pages/Notifications.tsx`
#### `pages/NewService.tsx`

---

## `utils/errorMessages.ts` - Komplett Englisch

Diese Datei enthält ~100 englische Error-Strings:
- Authentication errors
- Project/Service errors
- Domain errors
- Network errors
- Workspace/Team errors
- Template errors
- HTTP status fallbacks
- Field-specific errors

**Empfehlung:** Zu i18n migrieren oder deutsche Versionen hinzufügen.

---

## Fehlende Übersetzungskeys in `de.json`

Die folgenden Kategorien fehlen komplett:

```json
{
  "workspace": {
    "title": "Workspace-Einstellungen",
    "updated": "Workspace erfolgreich aktualisiert.",
    "updateFailed": "Workspace konnte nicht aktualisiert werden.",
    "roles": {
      "admin": "Admin",
      "member": "Mitglied",
      "deployer": "Deployer"
    },
    "invitations": {
      "send": "Einladung senden",
      "sending": "Wird gesendet...",
      "failed": "Einladung konnte nicht gesendet werden.",
      "cancel": "Einladung abbrechen"
    },
    "members": {
      "remove": "Mitglied entfernen",
      "removeConfirm": "Bist du sicher, dass du dieses Mitglied entfernen möchtest?",
      "leave": "Workspace verlassen",
      "leaveConfirm": "Bist du sicher, dass du diesen Workspace verlassen möchtest?"
    },
    "delete": {
      "confirm": "Bist du sicher, dass du diesen Workspace löschen möchtest?",
      "failed": "Workspace konnte nicht gelöscht werden."
    }
  },
  "activity": {
    "title": "Aktivitäten",
    "filters": {
      "all": "Alle Aktivitäten",
      "deployments": "Deployments",
      "services": "Services",
      "domains": "Domains",
      "environment": "Umgebung",
      "team": "Team"
    },
    "dates": {
      "today": "Heute",
      "yesterday": "Gestern"
    }
  },
  "emptyStates": {
    "projects": {
      "title": "Noch keine Projekte",
      "description": "Erstelle dein erstes Projekt, um Services in die Cloud zu deployen.",
      "action": "Projekt erstellen"
    },
    "services": {
      "title": "Keine Services in diesem Projekt",
      "description": "Füge einen Service von GitHub oder ein Docker-Image hinzu.",
      "action": "Service hinzufügen"
    },
    "deployments": {
      "title": "Noch keine Deployments",
      "description": "Deploye deinen Service, um ihn in der Cloud laufen zu sehen."
    },
    "notifications": {
      "title": "Alles erledigt!",
      "description": "Du hast momentan keine Benachrichtigungen."
    },
    "domains": {
      "title": "Keine Custom Domains",
      "description": "Füge eine Custom Domain hinzu, um deinen Service unter deiner eigenen URL zu erreichen.",
      "action": "Domain hinzufügen"
    },
    "envVars": {
      "title": "Keine Umgebungsvariablen",
      "description": "Füge Umgebungsvariablen hinzu, um deinen Service zu konfigurieren.",
      "action": "Variable hinzufügen"
    },
    "results": {
      "title": "Keine Ergebnisse gefunden"
    },
    "members": {
      "title": "Nur du hier",
      "description": "Lade Teammitglieder ein, um gemeinsam an Projekten zu arbeiten.",
      "action": "Mitglied einladen"
    }
  },
  "serviceModal": {
    "autoscaling": {
      "enabled": "Aktiviert",
      "disabled": "Deaktiviert",
      "saving": "Speichert...",
      "saveConfig": "Konfiguration speichern"
    },
    "deployments": {
      "retry": "Wiederholen",
      "retrying": "Wird wiederholt...",
      "redeploy": "Neu deployen",
      "redeploying": "Wird neu deployed...",
      "viewLogs": "Logs ansehen",
      "loading": "Lädt...",
      "noPendingLogs": "Keine Logs verfügbar während Deployment ansteht"
    },
    "settings": {
      "commandPlaceholder": "z.B. prefect server start",
      "commandHint": "Überschreibt den Standard-Befehl des Containers"
    },
    "overview": {
      "cpuHint": "\"m\" bedeutet Millicores. 1000m = 1 voller CPU-Kern.",
      "memoryMiHint": "\"Mi\" bedeutet Mebibytes (≈ Megabytes). 1024Mi = 1Gi = ~1GB.",
      "memoryGiHint": "\"Gi\" bedeutet Gibibytes (≈ Gigabytes).",
      "port": "Port",
      "replicas": "Replicas",
      "cpuLimit": "CPU-Limit",
      "memoryLimit": "Speicher-Limit",
      "cpuRequest": "CPU-Anforderung",
      "memoryRequest": "Speicher-Anforderung",
      "healthCheck": "Health Check"
    }
  },
  "addService": {
    "dockerImageRequired": "Docker-Image ist erforderlich",
    "couldNotGenerateName": "Service-Name konnte nicht aus den Angaben generiert werden",
    "selectTemplate": "Bitte wähle ein Template",
    "dockerPlaceholder": "postgres:14 oder registry.com/image:tag",
    "creating": "Wird erstellt...",
    "createService": "Service erstellen",
    "deploying": "Wird deployed...",
    "deployTemplate": "Template deployen"
  }
}
```

---

## Empfohlene Migration

### Phase 1: Hohe Priorität (1-2 Tage)
1. `components/EmptyState.tsx` - Wird überall angezeigt
2. `components/AddServiceModal.tsx` - Core User Flow
3. `pages/WorkspaceSettings.tsx` - Team Management
4. `components/GlobalSearch.tsx` - Globale Suche

### Phase 2: Mittlere Priorität (2-3 Tage)
1. `ServiceDetailModal/*` - Service Details
2. `pages/Activity.tsx` - Activity Feed
3. `pages/AuditLogs.tsx` - Audit Logs
4. `utils/errorMessages.ts` - Alle Error Messages

### Phase 3: Niedrige Priorität
1. Restliche Pages
2. `pages/Terms.tsx` & `pages/Privacy.tsx` - Rechtliche Texte

---

## Migrations-Pattern

```tsx
// VORHER
<button>Save Changes</button>
<span>Failed to update</span>

// NACHHER
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

<button>{t('common.save')}</button>
<span>{t('errors.updateFailed')}</span>
```

---

## Statistik

| Kategorie | Anzahl Dateien |
|-----------|----------------|
| Mit i18n (korrekt) | 11 |
| Ohne i18n (zu migrieren) | ~40 |
| Hardcoded Strings geschätzt | ~300+ |
