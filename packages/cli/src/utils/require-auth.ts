import config from '../lib/config';
import { log } from './output';

export function requireAuth(): void {
  if (!config.isLoggedIn()) {
    log.error('You must be logged in to run this command.');
    log.info(`Run ${log.code('kubidu login')} to authenticate.`);
    process.exit(1);
  }
}

export function requireProject(): { projectId: string; serviceId?: string } {
  requireAuth();

  const projectId = config.get('currentProject');
  const serviceId = config.get('currentService');

  if (!projectId) {
    log.error('No project linked.');
    log.info(`Run ${log.code('kubidu init')} or ${log.code('kubidu link')} to connect a project.`);
    process.exit(1);
  }

  return { projectId, serviceId };
}

export function requireService(): { projectId: string; serviceId: string } {
  const { projectId, serviceId } = requireProject();

  if (!serviceId) {
    log.error('No service selected.');
    log.info(`Run ${log.code('kubidu link')} to select a service.`);
    process.exit(1);
  }

  return { projectId, serviceId };
}
