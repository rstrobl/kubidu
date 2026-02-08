import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import api from '../lib/api';
import { log, createSpinner, formatTable } from '../utils/output';
import { requireService } from '../utils/require-auth';

export const envCommand = new Command('env')
  .description('Manage environment variables');

envCommand
  .command('list')
  .alias('ls')
  .description('List environment variables')
  .option('--reveal', 'Show secret values')
  .action(async (options) => {
    const { projectId, serviceId } = requireService();
    const spinner = createSpinner('Fetching environment variables...').start();

    try {
      const vars = await api.listEnvVars(projectId, serviceId);
      spinner.stop();

      if (vars.length === 0) {
        log.info('No environment variables set.');
        log.dim(`Add one with: kubidu env set KEY=value`);
        return;
      }

      log.newline();
      
      const rows = vars.map(v => [
        v.key,
        v.isSecret && !options.reveal ? chalk.dim('********') : v.value,
        v.isSecret ? chalk.yellow('secret') : '',
      ]);

      console.log(formatTable(['KEY', 'VALUE', 'TYPE'], rows));
      log.newline();
      log.dim(`${vars.length} variable(s)`);
      
      if (vars.some(v => v.isSecret) && !options.reveal) {
        log.dim('Use --reveal to show secret values');
      }

    } catch (error: any) {
      spinner.fail('Failed to fetch environment variables');
      log.error(error.message);
      process.exit(1);
    }
  });

envCommand
  .command('set <vars...>')
  .description('Set environment variable(s)')
  .option('-s, --secret', 'Mark as secret (encrypted)')
  .action(async (vars: string[], options) => {
    const { projectId, serviceId } = requireService();
    const spinner = createSpinner('Setting environment variables...').start();

    try {
      for (const varString of vars) {
        const eqIndex = varString.indexOf('=');
        if (eqIndex === -1) {
          spinner.fail(`Invalid format: ${varString}`);
          log.error('Use KEY=value format');
          process.exit(1);
        }

        const key = varString.slice(0, eqIndex);
        const value = varString.slice(eqIndex + 1);

        await api.setEnvVar(projectId, serviceId, key, value, options.secret);
        log.success(`Set ${key}`);
      }

      spinner.succeed(`Set ${vars.length} environment variable(s)`);
      log.newline();
      log.dim('Redeploy to apply changes: kubidu deploy');

    } catch (error: any) {
      spinner.fail('Failed to set environment variables');
      log.error(error.message);
      process.exit(1);
    }
  });

envCommand
  .command('unset <keys...>')
  .alias('rm')
  .description('Remove environment variable(s)')
  .option('-f, --force', 'Skip confirmation')
  .action(async (keys: string[], options) => {
    const { projectId, serviceId } = requireService();

    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Remove ${keys.length} variable(s)?`,
          default: false,
        },
      ]);

      if (!confirm) {
        log.info('Cancelled.');
        return;
      }
    }

    const spinner = createSpinner('Removing environment variables...').start();

    try {
      for (const key of keys) {
        await api.deleteEnvVar(projectId, serviceId, key);
        log.success(`Removed ${key}`);
      }

      spinner.succeed(`Removed ${keys.length} environment variable(s)`);
      log.newline();
      log.dim('Redeploy to apply changes: kubidu deploy');

    } catch (error: any) {
      spinner.fail('Failed to remove environment variables');
      log.error(error.message);
      process.exit(1);
    }
  });

envCommand
  .command('pull')
  .description('Download environment variables to .env file')
  .option('-o, --output <file>', 'Output file', '.env')
  .option('--overwrite', 'Overwrite existing file')
  .action(async (options) => {
    const { projectId, serviceId } = requireService();
    const fs = await import('fs');

    if (fs.existsSync(options.output) && !options.overwrite) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `${options.output} exists. Overwrite?`,
          default: false,
        },
      ]);

      if (!confirm) {
        log.info('Cancelled.');
        return;
      }
    }

    const spinner = createSpinner('Fetching environment variables...').start();

    try {
      const vars = await api.listEnvVars(projectId, serviceId);
      
      const content = vars
        .map(v => `${v.key}=${v.value}`)
        .join('\n');

      fs.writeFileSync(options.output, content + '\n');
      
      spinner.succeed(`Saved ${vars.length} variable(s) to ${options.output}`);
      log.warning('Do not commit this file to version control!');

    } catch (error: any) {
      spinner.fail('Failed to pull environment variables');
      log.error(error.message);
      process.exit(1);
    }
  });

envCommand
  .command('push')
  .description('Upload environment variables from .env file')
  .option('-i, --input <file>', 'Input file', '.env')
  .option('-s, --secret', 'Mark all as secret')
  .action(async (options) => {
    const { projectId, serviceId } = requireService();
    const fs = await import('fs');

    if (!fs.existsSync(options.input)) {
      log.error(`File not found: ${options.input}`);
      process.exit(1);
    }

    const spinner = createSpinner('Uploading environment variables...').start();

    try {
      const content = fs.readFileSync(options.input, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

      let count = 0;
      for (const line of lines) {
        const eqIndex = line.indexOf('=');
        if (eqIndex === -1) continue;

        const key = line.slice(0, eqIndex).trim();
        const value = line.slice(eqIndex + 1).trim();

        await api.setEnvVar(projectId, serviceId, key, value, options.secret);
        count++;
      }

      spinner.succeed(`Uploaded ${count} environment variable(s)`);
      log.newline();
      log.dim('Redeploy to apply changes: kubidu deploy');

    } catch (error: any) {
      spinner.fail('Failed to push environment variables');
      log.error(error.message);
      process.exit(1);
    }
  });
