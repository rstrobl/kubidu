import { Command } from 'commander';
import chalk from 'chalk';
import api from '../lib/api';
import { log, createSpinner, formatStatus, formatRelativeTime, box } from '../utils/output';
import { requireService } from '../utils/require-auth';

export const statusCommand = new Command('status')
  .description('Show deployment status')
  .option('-w, --watch', 'Watch for status changes')
  .action(async (options) => {
    const { projectId, serviceId } = requireService();

    if (options.watch) {
      await watchStatus(projectId, serviceId);
    } else {
      await showStatus(projectId, serviceId);
    }
  });

async function showStatus(projectId: string, serviceId: string): Promise<void> {
  const spinner = createSpinner('Fetching status...').start();

  try {
    const [statusInfo, domains, deployments] = await Promise.all([
      api.getServiceStatus(projectId, serviceId),
      api.listDomains(projectId, serviceId),
      api.listDeployments(projectId, serviceId),
    ]);

    spinner.stop();
    log.newline();

    const { service, deployment, metrics } = statusInfo;

    // Service Info Box
    console.log(box(`
  Service:   ${service.name}
  Status:    ${formatStatus(service.status)}
  Replicas:  ${service.replicas}
  Port:      ${service.port || 'auto'}
  Updated:   ${formatRelativeTime(service.updatedAt)}
`.trim(), 'Service'));

    log.newline();

    // Deployment Info
    if (deployment) {
      console.log(box(`
  ID:        ${deployment.id.slice(0, 8)}
  Status:    ${formatStatus(deployment.status)}
  Commit:    ${deployment.commitSha?.slice(0, 7) || 'N/A'}
  Message:   ${deployment.commitMessage || 'N/A'}
  Created:   ${formatRelativeTime(deployment.createdAt)}
`.trim(), 'Latest Deployment'));

      log.newline();
    }

    // Domains
    if (domains.length > 0) {
      const domainList = domains
        .map(d => `  ${formatStatus(d.status === 'active' ? '●' : '○')} ${d.domain}`)
        .join('\n');
      
      console.log(box(domainList, 'Domains'));
      log.newline();
    }

    // Metrics
    if (metrics) {
      const cpuBar = createProgressBar(metrics.cpu, 100, 20);
      const memBar = createProgressBar(metrics.memory, 100, 20);

      console.log(box(`
  CPU:    ${cpuBar} ${metrics.cpu.toFixed(1)}%
  Memory: ${memBar} ${metrics.memory.toFixed(1)}%
`.trim(), 'Resources'));

      log.newline();
    }

    // Quick URLs
    const primaryDomain = domains.find(d => d.status === 'active');
    const appUrl = primaryDomain 
      ? `https://${primaryDomain.domain}`
      : `https://${serviceId}.kubidu.app`;

    log.dim(`  App:       ${log.link(appUrl)}`);
    log.dim(`  Dashboard: ${log.link(`https://app.kubidu.dev/projects/${projectId}`)}`);
    log.newline();

  } catch (error: any) {
    spinner.fail('Failed to fetch status');
    log.error(error.message);
    process.exit(1);
  }
}

async function watchStatus(projectId: string, serviceId: string): Promise<void> {
  log.info('Watching status... (Ctrl+C to stop)');
  log.newline();

  const clearScreen = () => {
    process.stdout.write('\x1B[2J\x1B[H');
  };

  const update = async () => {
    try {
      const statusInfo = await api.getServiceStatus(projectId, serviceId);
      const { service, metrics } = statusInfo;

      clearScreen();
      
      console.log(chalk.bold('Kubidu Status Monitor'));
      console.log(chalk.dim(`Updated: ${new Date().toLocaleTimeString()}`));
      log.newline();

      console.log(`Service: ${service.name}`);
      console.log(`Status:  ${formatStatus(service.status)}`);
      console.log(`Replicas: ${service.replicas}`);

      if (metrics) {
        log.newline();
        const cpuBar = createProgressBar(metrics.cpu, 100, 30);
        const memBar = createProgressBar(metrics.memory, 100, 30);
        console.log(`CPU:    ${cpuBar} ${metrics.cpu.toFixed(1)}%`);
        console.log(`Memory: ${memBar} ${metrics.memory.toFixed(1)}%`);
      }

      log.newline();
      log.dim('Press Ctrl+C to exit');

    } catch (error) {
      // Silent refresh errors
    }
  };

  await update();
  const interval = setInterval(update, 2000);

  process.on('SIGINT', () => {
    clearInterval(interval);
    log.newline();
    log.dim('Stopped watching');
    process.exit(0);
  });
}

function createProgressBar(value: number, max: number, width: number): string {
  const percentage = Math.min(value / max, 1);
  const filled = Math.round(width * percentage);
  const empty = width - filled;

  const color = percentage > 0.9 ? chalk.red : percentage > 0.7 ? chalk.yellow : chalk.green;

  return `[${color('█'.repeat(filled))}${chalk.dim('░'.repeat(empty))}]`;
}
