# Issue #003: One-Click Rollback

**Priority:** 🔴 P0 (MUST-HAVE)  
**Effort:** 1-2 days  
**Assignee:** TBD  
**Labels:** `feature`, `blocking`, `reliability`, `quick-win`

---

## 📋 Summary

Implement instant rollback to any previous deployment. When a deploy breaks production, developers need to recover in seconds, not minutes. This is critical for user confidence.

## 🎯 Acceptance Criteria

- [ ] "Rollback" button visible on each deployment in history
- [ ] Rollback completes in < 30 seconds (no rebuild)
- [ ] Rollback preserves the target deployment's image
- [ ] Environment variables from target deployment are used
- [ ] Rollback creates a new deployment entry (audit trail)
- [ ] Confirmation dialog before rollback
- [ ] CLI command `kubidu rollback <deployment-id>`

## 🔧 Technical Implementation

### 1. API Endpoint

```typescript
// packages/api/src/modules/deployments/deployments.controller.ts

@Post(':id/rollback')
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Rollback to a previous deployment' })
async rollback(
  @Param('id') deploymentId: string,
  @GetUser() user: User,
) {
  return this.deploymentsService.rollback(user.id, deploymentId);
}
```

### 2. Rollback Service Logic

```typescript
// packages/api/src/modules/deployments/deployments.service.ts

async rollback(userId: string, targetDeploymentId: string): Promise<Deployment> {
  // 1. Get target deployment
  const target = await this.prisma.deployment.findUnique({
    where: { id: targetDeploymentId },
    include: { 
      service: true,
      environmentVariables: true,
    },
  });

  if (!target) {
    throw new NotFoundException('Deployment not found');
  }

  // 2. Verify user owns this deployment
  const service = await this.prisma.service.findFirst({
    where: { 
      id: target.serviceId,
      project: { userId },
    },
  });

  if (!service) {
    throw new ForbiddenException('Not authorized');
  }

  // 3. Verify target deployment was successful
  if (target.status !== DeploymentStatus.RUNNING && target.status !== DeploymentStatus.SUCCESS) {
    throw new BadRequestException('Cannot rollback to a failed deployment');
  }

  // 4. Create new deployment (rollback)
  const rollbackDeployment = await this.prisma.deployment.create({
    data: {
      serviceId: target.serviceId,
      status: DeploymentStatus.DEPLOYING,
      imageUrl: target.imageUrl,  // Use existing image!
      commitSha: target.commitSha,
      commitMessage: `Rollback to ${target.id.slice(0, 8)}`,
      port: target.port,
      replicas: target.replicas,
      cpuLimit: target.cpuLimit,
      memoryLimit: target.memoryLimit,
      rollbackFromId: target.id,  // Track rollback source
    },
  });

  // 5. Copy environment variables
  if (target.environmentVariables.length > 0) {
    await this.prisma.environmentVariable.createMany({
      data: target.environmentVariables.map(ev => ({
        deploymentId: rollbackDeployment.id,
        key: ev.key,
        valueEncrypted: ev.valueEncrypted,
        valueIv: ev.valueIv,
        isSecret: ev.isSecret,
      })),
    });
  }

  // 6. Enqueue deploy job (skip build!)
  await this.deployQueue.add('deploy', {
    deploymentId: rollbackDeployment.id,
    serviceId: target.serviceId,
    imageUrl: target.imageUrl,
    skipBuild: true,  // Critical: no rebuild
  });

  // 7. Audit log
  await this.auditService.log({
    userId,
    action: 'DEPLOYMENT_ROLLBACK',
    resourceType: 'Deployment',
    resourceId: rollbackDeployment.id,
    metadata: {
      targetDeploymentId,
      serviceId: target.serviceId,
    },
  });

  return rollbackDeployment;
}
```

### 3. Update Deploy Controller

```typescript
// packages/deploy-controller/src/processors/deploy.processor.ts

@Process('deploy')
async handleDeploy(job: Job<DeployJobData>) {
  const { deploymentId, imageUrl, skipBuild } = job.data;

  // If skipBuild is true (rollback), go straight to K8s update
  if (skipBuild && imageUrl) {
    await this.updateK8sDeployment(deploymentId, imageUrl);
    return;
  }

  // Normal flow: build first, then deploy
  // ...existing code
}
```

### 4. Schema Update

```prisma
// packages/api/prisma/schema.prisma

model Deployment {
  // ... existing fields
  
  rollbackFromId  String?
  rollbackFrom    Deployment?  @relation("RollbackHistory", fields: [rollbackFromId], references: [id])
  rollbacksTo     Deployment[] @relation("RollbackHistory")
}
```

### 5. CLI Command

```typescript
// packages/cli/src/commands/rollback.ts
import { Command } from 'commander';

export const rollbackCommand = new Command('rollback')
  .description('Rollback to a previous deployment')
  .argument('<deployment-id>', 'Deployment ID to rollback to')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (deploymentId, options) => {
    const { serviceId } = requireService();

    if (!options.yes) {
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Rollback to deployment ${deploymentId.slice(0, 8)}?`,
        default: false,
      }]);
      
      if (!confirm) {
        log.info('Rollback cancelled');
        return;
      }
    }

    const spinner = createSpinner('Rolling back...').start();

    try {
      const deployment = await api.rollback(serviceId, deploymentId);
      spinner.succeed(`Rolled back successfully!`);
      log.info(`New deployment: ${deployment.id}`);
    } catch (error) {
      spinner.fail('Rollback failed');
      log.error(error.message);
      process.exit(1);
    }
  });
```

### 6. UI Components

```tsx
// packages/web/src/components/deployments/DeploymentRow.tsx

function DeploymentRow({ deployment }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const rollbackMutation = useRollback();

  const canRollback = ['RUNNING', 'SUCCESS'].includes(deployment.status) 
    && !deployment.isCurrent;

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div>
        <span className="font-mono text-sm">{deployment.id.slice(0, 8)}</span>
        <span className="ml-2 text-gray-500">{deployment.commitMessage}</span>
        {deployment.rollbackFromId && (
          <span className="ml-2 text-amber-500">↩ Rollback</span>
        )}
      </div>
      
      <div className="flex gap-2">
        <StatusBadge status={deployment.status} />
        
        {canRollback && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowConfirm(true)}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Rollback
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          rollbackMutation.mutate(deployment.id);
          setShowConfirm(false);
        }}
        title="Confirm Rollback"
        description={`This will immediately deploy the code from ${deployment.id.slice(0, 8)}. Your current deployment will be replaced.`}
      />
    </div>
  );
}
```

## 📁 Files to Create/Modify

- [ ] `packages/api/prisma/schema.prisma` (add rollbackFromId)
- [ ] `packages/api/src/modules/deployments/deployments.controller.ts` (add endpoint)
- [ ] `packages/api/src/modules/deployments/deployments.service.ts` (add rollback method)
- [ ] `packages/deploy-controller/src/processors/deploy.processor.ts` (handle skipBuild)
- [ ] `packages/cli/src/commands/rollback.ts` (create)
- [ ] `packages/cli/src/index.ts` (register command)
- [ ] `packages/web/src/components/deployments/DeploymentRow.tsx` (add button)
- [ ] `packages/web/src/hooks/useRollback.ts` (create mutation hook)

## 🧪 Test Cases

1. Rollback to successful deployment → new deployment created, old image used
2. Rollback to failed deployment → error "Cannot rollback to failed"
3. Rollback unauthorized deployment → 403 Forbidden
4. Rollback completes in < 30s (no build step)
5. CLI `kubidu rollback <id>` → works
6. Audit log created for rollback

## ⚡ Performance Requirements

- Rollback must complete in < 30 seconds
- No Docker build step
- Direct K8s deployment update
- Instant pod replacement

## 🚫 Out of Scope

- Automatic rollback on health check failure (future)
- Rollback to specific commit SHA (use deployment ID)
- Partial rollback (specific replicas)

## 📚 References

- [K8s Deployment Rollback](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-back-a-deployment)
- [Railway rollback](https://docs.railway.app/guides/deployments#rollback)

---

*Created: 2026-02-09*
