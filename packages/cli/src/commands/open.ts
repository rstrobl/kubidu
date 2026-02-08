import { Command } from 'commander';
import open from 'open';
import api from '../lib/api';
import config from '../lib/config';
import { log, createSpinner } from '../utils/output';
import { requireService } from '../utils/require-auth';

export const openCommand = new Command('open')
  .description('Open project in browser')
  .option('-d, --dashboard', 'Open dashboard instead of app')
  .action(async (options) => {
    const { projectId, serviceId } = requireService();

    if (options.dashboard) {
      const dashboardUrl = `${config.getApiUrl().replace('api.', 'app.')}/projects/${projectId}/services/${serviceId}`;
      log.info(`Opening dashboard: ${log.link(dashboardUrl)}`);
      await open(dashboardUrl);
      return;
    }

    const spinner = createSpinner('Fetching service URL...').start();

    try {
      const domains = await api.listDomains(projectId, serviceId);
      spinner.stop();

      let url: string;

      // Prefer custom domain if available
      const activeDomain = domains.find(d => d.status === 'active');
      if (activeDomain) {
        url = `https://${activeDomain.domain}`;
      } else {
        // Use default kubidu.app subdomain
        url = `https://${serviceId}.kubidu.app`;
      }

      log.info(`Opening: ${log.link(url)}`);
      await open(url);

    } catch (error: any) {
      spinner.fail('Failed to get service URL');
      log.error(error.message);
      process.exit(1);
    }
  });
