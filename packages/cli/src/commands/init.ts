import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';
import api from '../lib/api';
import config from '../lib/config';
import { log, createSpinner } from '../utils/output';
import { requireAuth } from '../utils/require-auth';

export const initCommand = new Command('init')
  .description('Initialize a new Kubidu project in the current directory')
  .option('-n, --name <name>', 'Project name')
  .option('-y, --yes', 'Accept defaults without prompting')
  .action(async (options) => {
    requireAuth();

    const cwd = process.cwd();
    const dirName = path.basename(cwd);

    // Check if already initialized
    const configPath = path.join(cwd, 'kubidu.yaml');
    if (fs.existsSync(configPath) && !options.yes) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'kubidu.yaml already exists. Overwrite?',
          default: false,
        },
      ]);
      if (!overwrite) {
        log.info('Initialization cancelled.');
        return;
      }
    }

    let projectName = options.name;
    let serviceName = dirName;

    if (!options.yes) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'Project name:',
          default: dirName,
          validate: (input: string) => 
            /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(input) || 
            'Must be lowercase alphanumeric with optional hyphens',
        },
        {
          type: 'input',
          name: 'serviceName',
          message: 'Service name:',
          default: dirName,
          validate: (input: string) => 
            /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(input) || 
            'Must be lowercase alphanumeric with optional hyphens',
        },
      ]);
      projectName = answers.projectName;
      serviceName = answers.serviceName;
    } else {
      projectName = projectName || dirName;
    }

    const spinner = createSpinner('Creating project...').start();

    try {
      // Create project via API
      const project = await api.createProject(projectName);
      
      // Create service
      spinner.text = 'Creating service...';
      const service = await api.createService(project.id, serviceName);

      // Save to local config
      config.set('currentProject', project.id);
      config.set('currentService', service.id);

      // Create kubidu.yaml
      const kubiduConfig = `# Kubidu Configuration
# Docs: https://docs.kubidu.dev/configuration

name: ${projectName}
service: ${serviceName}

# Build configuration
build:
  # dockerfile: Dockerfile
  # context: .

# Deployment configuration
deploy:
  replicas: 1
  # port: 3000
  # healthcheck: /health

# Environment variables (use 'kubidu env set' for secrets)
# env:
#   NODE_ENV: production
`;

      fs.writeFileSync(configPath, kubiduConfig);

      spinner.succeed('Project initialized!');
      log.newline();
      log.info(`Project: ${project.name} (${project.id})`);
      log.info(`Service: ${service.name} (${service.id})`);
      log.newline();
      log.dim('Created kubidu.yaml');
      log.newline();
      log.info(`Next steps:`);
      log.dim(`  1. Add environment variables: kubidu env set KEY=value`);
      log.dim(`  2. Deploy your app: kubidu deploy`);
      log.newline();

    } catch (error: any) {
      spinner.fail('Initialization failed');
      log.error(error.message);
      process.exit(1);
    }
  });
