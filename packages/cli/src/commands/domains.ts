import { Command } from 'commander';
import inquirer from 'inquirer';
import api from '../lib/api';
import { log, createSpinner, formatTable, formatStatus } from '../utils/output';
import { requireService } from '../utils/require-auth';

export const domainsCommand = new Command('domains')
  .description('Manage custom domains');

domainsCommand
  .command('list')
  .alias('ls')
  .description('List domains')
  .action(async () => {
    const { projectId, serviceId } = requireService();
    const spinner = createSpinner('Fetching domains...').start();

    try {
      const domains = await api.listDomains(projectId, serviceId);
      spinner.stop();

      if (domains.length === 0) {
        log.info('No custom domains configured.');
        log.dim(`Add one with: kubidu domains add <domain>`);
        return;
      }

      log.newline();
      
      const rows = domains.map(d => [
        d.domain,
        formatStatus(d.status),
        formatStatus(d.sslStatus),
      ]);

      console.log(formatTable(['DOMAIN', 'STATUS', 'SSL'], rows));
      log.newline();

    } catch (error: any) {
      spinner.fail('Failed to fetch domains');
      log.error(error.message);
      process.exit(1);
    }
  });

domainsCommand
  .command('add <domain>')
  .description('Add a custom domain')
  .action(async (domain: string) => {
    const { projectId, serviceId } = requireService();

    // Validate domain format
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    if (!domainRegex.test(domain)) {
      log.error('Invalid domain format');
      process.exit(1);
    }

    const spinner = createSpinner(`Adding ${domain}...`).start();

    try {
      const result = await api.addDomain(projectId, serviceId, domain);
      spinner.succeed(`Domain added: ${domain}`);
      
      log.newline();
      log.info('Configure your DNS with the following record:');
      log.newline();
      console.log(`  Type:  CNAME`);
      console.log(`  Name:  ${domain}`);
      console.log(`  Value: ${result.serviceId}.kubidu.app`);
      log.newline();
      log.dim('SSL certificate will be provisioned automatically once DNS is configured.');

    } catch (error: any) {
      spinner.fail('Failed to add domain');
      log.error(error.message);
      process.exit(1);
    }
  });

domainsCommand
  .command('remove <domain>')
  .alias('rm')
  .description('Remove a custom domain')
  .option('-f, --force', 'Skip confirmation')
  .action(async (domain: string, options) => {
    const { projectId, serviceId } = requireService();

    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Remove domain ${domain}?`,
          default: false,
        },
      ]);

      if (!confirm) {
        log.info('Cancelled.');
        return;
      }
    }

    const spinner = createSpinner(`Removing ${domain}...`).start();

    try {
      // Find domain ID
      const domains = await api.listDomains(projectId, serviceId);
      const found = domains.find(d => d.domain === domain);
      
      if (!found) {
        spinner.fail(`Domain not found: ${domain}`);
        process.exit(1);
      }

      await api.deleteDomain(projectId, serviceId, found.id);
      spinner.succeed(`Domain removed: ${domain}`);

    } catch (error: any) {
      spinner.fail('Failed to remove domain');
      log.error(error.message);
      process.exit(1);
    }
  });

domainsCommand
  .command('check <domain>')
  .description('Check domain DNS configuration')
  .action(async (domain: string) => {
    const spinner = createSpinner(`Checking DNS for ${domain}...`).start();

    try {
      const dns = await import('dns').then(m => m.promises);
      
      try {
        const records = await dns.resolveCname(domain);
        spinner.stop();
        
        log.newline();
        log.info(`CNAME records for ${domain}:`);
        for (const record of records) {
          console.log(`  → ${record}`);
          if (record.includes('kubidu.app')) {
            log.success('DNS is correctly configured!');
          }
        }
      } catch (dnsError: any) {
        if (dnsError.code === 'ENODATA' || dnsError.code === 'ENOTFOUND') {
          spinner.fail('No CNAME record found');
          log.error(`Please add a CNAME record pointing to your-service.kubidu.app`);
        } else {
          throw dnsError;
        }
      }

    } catch (error: any) {
      spinner.fail('Failed to check DNS');
      log.error(error.message);
      process.exit(1);
    }
  });
