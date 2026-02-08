import { Command } from 'commander';
import open from 'open';
import api from '../lib/api';
import config from '../lib/config';
import { log, createSpinner } from '../utils/output';

export const loginCommand = new Command('login')
  .description('Authenticate with Kubidu via browser')
  .option('--token <token>', 'Use API token directly (for CI/CD)')
  .action(async (options) => {
    if (options.token) {
      // Direct token authentication
      config.set('apiToken', options.token);
      
      const spinner = createSpinner('Verifying token...').start();
      try {
        const user = await api.getCurrentUser();
        config.set('userId', user.id);
        config.set('userEmail', user.email);
        spinner.succeed(`Logged in as ${user.email}`);
      } catch (error) {
        config.delete('apiToken');
        spinner.fail('Invalid token');
        process.exit(1);
      }
      return;
    }

    // Browser-based authentication
    const spinner = createSpinner('Initializing login...').start();

    try {
      const { url, token } = await api.getAuthUrl();
      spinner.stop();

      log.info('Opening browser for authentication...');
      log.dim(`If the browser doesn't open, visit: ${log.link(url)}`);
      log.newline();

      await open(url);

      const pollSpinner = createSpinner('Waiting for authentication...').start();

      // Poll for auth completion
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes
      
      while (attempts < maxAttempts) {
        const result = await api.pollAuthStatus(token);
        
        if (result) {
          config.set('apiToken', result.apiToken);
          config.set('userId', result.user.id);
          config.set('userEmail', result.user.email);
          
          pollSpinner.succeed(`Logged in as ${result.user.email}`);
          log.newline();
          log.success('Authentication complete!');
          log.dim(`Your token is stored in ~/.config/kubidu/config.json`);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      pollSpinner.fail('Authentication timed out');
      log.error('Please try again.');
      process.exit(1);

    } catch (error: any) {
      spinner.fail('Login failed');
      log.error(error.message);
      process.exit(1);
    }
  });
