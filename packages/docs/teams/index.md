# Teams & Workspaces

Collaborate with your team on Kubidu. Manage access, organize projects, and maintain security.

## Overview

Kubidu uses a simple organizational model:

```
Organization
    └── Workspaces
            └── Apps
```

- **Organization** — Your company or team
- **Workspaces** — Logical groupings (by team, project, or environment)
- **Apps** — Individual deployed applications

## Getting Started

### Create a Workspace

```bash
kubidu workspace create my-team
```

### Invite Team Members

```bash
kubidu members invite alice@example.com --role developer
```

### View Your Team

```bash
kubidu members list
```

```
NAME               EMAIL                    ROLE        JOINED
Alice Smith        alice@example.com        admin       2 months ago
Bob Johnson        bob@example.com          developer   1 month ago
Charlie Brown      charlie@example.com      viewer      1 week ago
```

## Quick Links

- [Workspaces](/teams/workspaces) — Create and manage workspaces
- [Team Members](/teams/members) — Invite and manage team members
- [Permissions](/teams/permissions) — Understand roles and access control

## Role Summary

| Role | Deploy | Configure | Invite | Billing |
|------|--------|-----------|--------|---------|
| Viewer | ❌ | ❌ | ❌ | ❌ |
| Developer | ✅ | ✅ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ | ❌ |
| Owner | ✅ | ✅ | ✅ | ✅ |

## Key Features

### Audit Logs

Track all actions in your workspace:

```bash
kubidu audit-log
```

```
TIME                  USER           ACTION              RESOURCE
2024-01-15 10:30:00  alice@...      deploy              my-app
2024-01-15 10:15:00  bob@...        env.set             my-app
2024-01-15 09:00:00  alice@...      member.invite       charlie@...
```

### Single Sign-On (SSO)

Enterprise plans support SSO via:
- SAML 2.0
- OpenID Connect
- Google Workspace
- Microsoft Entra ID

### Two-Factor Authentication

Require 2FA for all team members:

```bash
kubidu settings set require-2fa true
```

## Next Steps

- [Set up your first workspace](/teams/workspaces)
- [Invite your team](/teams/members)
- [Configure permissions](/teams/permissions)
