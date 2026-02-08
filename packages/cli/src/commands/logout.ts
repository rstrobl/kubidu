import { Command } from 'commander';
import config from '../lib/config';
import { log } from '../utils/output';

export const logoutCommand = new Command('logout')
  .description('Clear stored credentials')
  .option('-f, --force', 'Skip confirmation')
  .action(async (options) => {
    if (!config.isLoggedIn()) {
      log.info('You are not logged in.');
      return;
    }

    const email = config.get('userEmail');

    if (!options.force) {
      const inquirer = await import('inquirer');
      const { confirm } = await inquirer.default.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Log out from ${email}?`,
          default: false,
        },
      ]);

      if (!confirm) {
        log.info('Logout cancelled.');
        return;
      }
    }

    config.clear();
    log.success('Logged out successfully.');
  });
