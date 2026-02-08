import { Command } from 'commander';
import inquirer from 'inquirer';
import api from '../lib/api';
import { log, createSpinner, formatTable, formatStatus, formatRelativeTime } from '../utils/output';
import { requireProject, requireService } from '../utils/require-auth';

export const psCommand = new Command('ps')
  .description('List services and their status')
  .action(async () => {
    const { projectId } = requireProject();
    const spinner = createSpinner('Fetching services...').start();

    try {
      const services = await api.listServices(projectId);
      spinner.stop();

      if (services.length === 0) {
        log.info('No services found.');
        log.dim(`Create one with: kubidu init`);
        return;
      }

      log.newline();
      
      const rows = services.map(s => [
        s.name,
        formatStatus(s.status),
        s.replicas.toString(),
        s.port?.toString() || '-',
        formatRelativeTime(s.updatedAt),
      ]);

      console.log(formatTable(['SERVICE', 'STATUS', 'REPLICAS', 'PORT', 'UPDATED'], rows));
      log.newline();

    } catch (error: any) {
      spinner.fail('Failed to fetch services');
      log.error(error.message);
      process.exit(1);
    }
  });

export const psScaleCommand = new Command('ps:scale')
  .description('Scale service replicas')
  .argument('<replicas>', 'Number of replicas')
  .option('-s, --service <name>', 'Service name')
  .action(async (replicasStr: string, options) => {
    const { projectId, serviceId } = requireService();
    
    const replicas = parseInt(replicasStr, 10);
    if (isNaN(replicas) || replicas < 0 || replicas > 100) {
      log.error('Replicas must be a number between 0 and 100');
      process.exit(1);
    }

    const spinner = createSpinner(`Scaling to ${replicas} replica(s)...`).start();

    try {
      const service = await api.scaleService(projectId, serviceId, replicas);
      spinner.succeed(`Scaled ${service.name} to ${replicas} replica(s)`);

      if (replicas === 0) {
        log.warning('Service is now scaled to 0 (stopped)');
      }

    } catch (error: any) {
      spinner.fail('Failed to scale service');
      log.error(error.message);
      process.exit(1);
    }
  });

export const psRestartCommand = new Command('ps:restart')
  .description('Restart all replicas')
  .option('-s, --service <name>', 'Service name')
  .action(async (options) => {
    const { projectId, serviceId } = requireService();
    const spinner = createSpinner('Restarting service...').start();

    try {
      // Get current replicas
      const service = await api.getService(projectId, serviceId);
      const replicas = service.replicas;

      // Scale to 0 then back
      await api.scaleService(projectId, serviceId, 0);
      await new Promise(resolve => setTimeout(resolve, 2000));
      await api.scaleService(projectId, serviceId, replicas);

      spinner.succeed(`Restarted ${service.name}`);

    } catch (error: any) {
      spinner.fail('Failed to restart service');
      log.error(error.message);
      process.exit(1);
    }
  });

export const psStopCommand = new Command('ps:stop')
  .description('Stop service (scale to 0)')
  .option('-s, --service <name>', 'Service name')
  .action(async (options) => {
    const { projectId, serviceId } = requireService();

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Stop service? This will scale to 0 replicas.',
        default: false,
      },
    ]);

    if (!confirm) {
      log.info('Cancelled.');
      return;
    }

    const spinner = createSpinner('Stopping service...').start();

    try {
      await api.scaleService(projectId, serviceId, 0);
      spinner.succeed('Service stopped');

    } catch (error: any) {
      spinner.fail('Failed to stop service');
      log.error(error.message);
      process.exit(1);
    }
  });
