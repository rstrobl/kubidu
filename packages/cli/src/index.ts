#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { whoamiCommand } from './commands/whoami';
import { initCommand } from './commands/init';
import { linkCommand } from './commands/link';
import { deployCommand } from './commands/deploy';
import { logsCommand } from './commands/logs';
import { envCommand } from './commands/env';
import { psCommand, psScaleCommand, psRestartCommand, psStopCommand } from './commands/ps';
import { domainsCommand } from './commands/domains';
import { openCommand } from './commands/open';
import { statusCommand } from './commands/status';

const pkg = require('../package.json');

const program = new Command();

// ASCII Art Banner
const banner = chalk.cyan(`
  ╭─────────────────────────────╮
  │                             │
  │   ${chalk.bold('KUBIDU')}   ${chalk.dim('Deploy with ease')}   │
  │                             │
  ╰─────────────────────────────╯
`);

program
  .name('kubidu')
  .version(pkg.version, '-v, --version')
  .description('Kubidu CLI - Deploy your apps with ease')
  .addHelpText('before', banner)
  .configureHelp({
    sortSubcommands: true,
  });

// Authentication commands
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(whoamiCommand);

// Project commands
program.addCommand(initCommand);
program.addCommand(linkCommand);

// Deployment commands
program.addCommand(deployCommand);
program.addCommand(logsCommand);
program.addCommand(statusCommand);

// Environment commands
program.addCommand(envCommand);

// Service commands
program.addCommand(psCommand);
program.addCommand(psScaleCommand);
program.addCommand(psRestartCommand);
program.addCommand(psStopCommand);

// Domain commands
program.addCommand(domainsCommand);

// Utility commands
program.addCommand(openCommand);

// Global options
program
  .option('--api-url <url>', 'Override API URL')
  .option('--token <token>', 'Override API token')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.apiUrl) {
      process.env.KUBIDU_API_URL = opts.apiUrl;
    }
    if (opts.token) {
      process.env.KUBIDU_API_TOKEN = opts.token;
    }
  });

// Error handling
program.exitOverride((err) => {
  if (err.code === 'commander.help') {
    process.exit(0);
  }
  if (err.code === 'commander.version') {
    process.exit(0);
  }
  process.exit(1);
});

// Parse arguments
program.parseAsync(process.argv).catch((error) => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
});
