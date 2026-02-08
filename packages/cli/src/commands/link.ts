import { Command } from 'commander';
import inquirer from 'inquirer';
import api from '../lib/api';
import config from '../lib/config';
import { log, createSpinner, formatRelativeTime } from '../utils/output';
import { requireAuth } from '../utils/require-auth';

export const linkCommand = new Command('link')
  .description('Link current directory to an existing project')
  .option('-p, --project <id>', 'Project ID or name')
  .option('-s, --service <id>', 'Service ID or name')
  .action(async (options) => {
    requireAuth();

    const spinner = createSpinner('Fetching projects...').start();

    try {
      const projects = await api.listProjects();
      spinner.stop();

      if (projects.length === 0) {
        log.info('No projects found.');
        log.dim(`Create one with: kubidu init`);
        return;
      }

      let selectedProject = projects[0];

      if (options.project) {
        const found = projects.find(
          p => p.id === options.project || p.name === options.project || p.slug === options.project
        );
        if (!found) {
          log.error(`Project "${options.project}" not found.`);
          process.exit(1);
        }
        selectedProject = found;
      } else {
        const { projectId } = await inquirer.prompt([
          {
            type: 'list',
            name: 'projectId',
            message: 'Select a project:',
            choices: projects.map(p => ({
              name: `${p.name} (created ${formatRelativeTime(p.createdAt)})`,
              value: p.id,
            })),
          },
        ]);
        selectedProject = projects.find(p => p.id === projectId)!;
      }

      // Fetch services
      spinner.text = 'Fetching services...';
      spinner.start();
      const services = await api.listServices(selectedProject.id);
      spinner.stop();

      let selectedService = services[0];

      if (services.length === 0) {
        log.info('No services found in this project.');
        log.dim(`Create one with: kubidu init`);
        return;
      }

      if (options.service) {
        const found = services.find(
          s => s.id === options.service || s.name === options.service
        );
        if (!found) {
          log.error(`Service "${options.service}" not found.`);
          process.exit(1);
        }
        selectedService = found;
      } else if (services.length > 1) {
        const { serviceId } = await inquirer.prompt([
          {
            type: 'list',
            name: 'serviceId',
            message: 'Select a service:',
            choices: services.map(s => ({
              name: `${s.name} (${s.status})`,
              value: s.id,
            })),
          },
        ]);
        selectedService = services.find(s => s.id === serviceId)!;
      }

      // Save to config
      config.set('currentProject', selectedProject.id);
      config.set('currentService', selectedService.id);

      log.success('Project linked!');
      log.newline();
      log.info(`Project: ${selectedProject.name}`);
      log.info(`Service: ${selectedService.name}`);
      log.newline();

    } catch (error: any) {
      spinner.fail('Failed to link project');
      log.error(error.message);
      process.exit(1);
    }
  });
