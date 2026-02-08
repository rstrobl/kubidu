import { Command } from 'commander';
import api from '../lib/api';
import config from '../lib/config';
import { log, createSpinner } from '../utils/output';
import { requireAuth } from '../utils/require-auth';

export const whoamiCommand = new Command('whoami')
  .description('Show current logged in user')
  .action(async () => {
    requireAuth();

    const spinner = createSpinner('Fetching user info...').start();

    try {
      const user = await api.getCurrentUser();
      spinner.stop();

      log.newline();
      console.log(`  Email:   ${user.email}`);
      console.log(`  Name:    ${user.name}`);
      console.log(`  ID:      ${user.id}`);
      log.newline();
      log.dim(`  API URL: ${config.getApiUrl()}`);
      log.newline();

    } catch (error: any) {
      spinner.fail('Failed to fetch user info');
      log.error(error.message);
      process.exit(1);
    }
  });
