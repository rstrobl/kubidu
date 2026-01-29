# Schema Refactoring Migration Guide

## Changes Summary

### 1. Environment Variables Architecture
**BEFORE:** 3 scopes (Project, Service, Deployment)
**AFTER:** 2 scopes (Service, Deployment)

**Why:** Environment variables in Railway/Heroku are set per service, not per project. This matches industry standards.

- **Service-level env vars**: Inherited by all deployments (e.g., `DATABASE_URL`, `API_KEY`)
- **Deployment-level env vars**: Override service defaults for specific deployments (e.g., staging vs production)

### 2. Domain Ownership
**BEFORE:** Domains tied to Deployments
**AFTER:** Domains tied to Services

**Why:** When you redeploy a service, the domain should stay the same. Domains are permanent URLs for a service.

### 3. Resource Configuration
**BEFORE:** Only Service has resource limits
**AFTER:** Service has defaults, Deployment can override

**Why:** Allows different resource allocations per deployment (e.g., staging with less resources).

### 4. Type Safety
**BEFORE:** String enums (`status: "active"`)
**AFTER:** Prisma enums (`status: UserStatus.ACTIVE`)

**Why:** Compile-time type checking, autocomplete, prevents typos.

### 5. Missing Relations Fixed
- BuildQueue → Service
- WebhookEvent → Service
- All models → User (for cascade operations)

### 6. Database Indexes Added
- Composite indexes for fast filtered queries
- Unique constraints to prevent duplicates

## Migration Steps

### Step 1: Backup Current Data
```bash
# Export current database
docker exec kubidu-postgres pg_dump -U kubidu kubidu > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Replace Schema
```bash
cd /Users/robert/Projects/kubidu/packages/api
mv prisma/schema.prisma prisma/schema.prisma.old
mv prisma/schema-refactored.prisma prisma/schema.prisma
```

### Step 3: Create Migration
```bash
npx prisma migrate dev --name refactor_schema --create-only
```

### Step 4: Manual Migration Adjustments

Edit the generated migration file to handle data migration:

```sql
-- 1. Migrate project-level env vars to service-level
-- If any project has env vars, we need to decide which service gets them
-- For now, we'll delete project-level env vars (none exist yet in dev)

-- 2. Update Domains from deployment to service
-- ALTER TABLE domains RENAME COLUMN deployment_id TO service_id;
-- (Migration will handle this)

-- 3. Add enum types
-- (Migration will handle this)

-- 4. Update status fields to use enums
-- (Migration will handle this with casting)
```

### Step 5: Apply Migration
```bash
npx prisma migrate dev
```

### Step 6: Generate Prisma Client
```bash
npx prisma generate
```

### Step 7: Update Application Code

**Files to update:**
1. `packages/shared/src/types/index.ts` - Update enum imports
2. `packages/api/src/modules/environments/environments.service.ts` - Remove projectId logic
3. `packages/api/src/modules/environments/dto/set-environment-variable.dto.ts` - Remove projectId
4. `packages/api/src/modules/deployments/deployments.service.ts` - Update resource config logic

### Step 8: Test
```bash
# Restart API
docker restart kubidu-api

# Run tests
npm test
```

## Breaking Changes

### API Changes
```typescript
// BEFORE: Set env var at project level
POST /environments
{ projectId: "...", key: "API_KEY", value: "..." }

// AFTER: Must specify service
POST /environments
{ serviceId: "...", key: "API_KEY", value: "..." }
```

### Code Changes
```typescript
// BEFORE
await prisma.environmentVariable.create({
  data: {
    projectId: project.id,
    key: 'DATABASE_URL',
    value: '...'
  }
});

// AFTER
await prisma.environmentVariable.create({
  data: {
    serviceId: service.id,  // Must be tied to service
    key: 'DATABASE_URL',
    value: '...'
  }
});
```

## Rollback Plan

If issues occur:
```bash
# Restore from backup
docker exec -i kubidu-postgres psql -U kubidu kubidu < backup_TIMESTAMP.sql

# Revert schema
mv prisma/schema.prisma.old prisma/schema.prisma
npx prisma generate

# Restart
docker restart kubidu-api
```

## Validation Checklist

After migration:
- [ ] API starts successfully
- [ ] Can create projects
- [ ] Can create services
- [ ] Can set service-level env vars
- [ ] Can set deployment-level env vars
- [ ] Can add domains to services
- [ ] All foreign keys working
- [ ] Enum types working
- [ ] Indexes created (check with `\d+ table_name` in psql)
