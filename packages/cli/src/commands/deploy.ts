import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import ignore from 'ignore';
import api from '../lib/api';
import { log, createSpinner, formatStatus, formatDuration } from '../utils/output';
import { requireService } from '../utils/require-auth';

export const deployCommand = new Command('deploy')
  .description('Deploy the current directory')
  .option('-w, --watch', 'Watch for changes and redeploy')
  .option('-m, --message <message>', 'Deployment message')
  .option('--no-build', 'Skip build step (use existing image)')
  .action(async (options) => {
    const { projectId, serviceId } = requireService();

    if (options.watch) {
      await watchAndDeploy(projectId, serviceId);
    } else {
      await runDeploy(projectId, serviceId, options.message);
    }
  });

async function runDeploy(projectId: string, serviceId: string, _message?: string): Promise<void> {
  const spinner = createSpinner('Preparing deployment...').start();
  const startTime = Date.now();

  try {
    // Create tarball of current directory
    spinner.text = 'Creating archive...';
    const archive = await createArchive(process.cwd());

    spinner.text = `Uploading (${(archive.length / 1024).toFixed(1)} KB)...`;

    // Upload and start deployment
    const deployment = await api.deploy(projectId, serviceId, archive);
    
    spinner.text = 'Building...';

    // Poll for deployment status
    let currentStatus = deployment.status;
    while (['pending', 'building', 'deploying'].includes(currentStatus)) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const updated = await api.getDeployment(projectId, serviceId, deployment.id);
      currentStatus = updated.status;
      
      if (currentStatus === 'building') {
        spinner.text = 'Building Docker image...';
      } else if (currentStatus === 'deploying') {
        spinner.text = 'Deploying to cluster...';
      }
    }

    const duration = Date.now() - startTime;

    if (currentStatus === 'success') {
      spinner.succeed(`Deployed successfully in ${formatDuration(duration)}`);
      log.newline();
      
      // Get service info for URL
      const status = await api.getServiceStatus(projectId, serviceId);
      if (status.service) {
        log.info(`Status: ${formatStatus(status.service.status)}`);
        log.dim(`Deployment ID: ${deployment.id}`);
      }
      log.newline();
    } else {
      spinner.fail('Deployment failed');
      log.error(`Status: ${formatStatus(currentStatus)}`);
      log.dim('Check logs with: kubidu logs');
      process.exit(1);
    }

  } catch (error: any) {
    spinner.fail('Deployment failed');
    log.error(error.message);
    process.exit(1);
  }
}

async function createArchive(directory: string): Promise<Buffer> {
  const ig = ignore();
  
  // Load .gitignore if exists
  const gitignorePath = path.join(directory, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    ig.add(fs.readFileSync(gitignorePath, 'utf-8'));
  }

  // Load .kubiduignore if exists
  const kubiduignorePath = path.join(directory, '.kubiduignore');
  if (fs.existsSync(kubiduignorePath)) {
    ig.add(fs.readFileSync(kubiduignorePath, 'utf-8'));
  }

  // Always ignore these
  ig.add([
    '.git',
    'node_modules',
    '.env.local',
    '.env*.local',
    '*.log',
    '.DS_Store',
    'Thumbs.db',
  ]);

  // Get list of files to include
  const files = getAllFiles(directory, ig, directory);

  // Create tar archive to buffer
  const tmpFile = `/tmp/kubidu-deploy-${Date.now()}.tar.gz`;
  const fileListPath = `/tmp/kubidu-files-${Date.now()}.txt`;
  
  // Write file list
  fs.writeFileSync(fileListPath, files.join('\n'));
  
  // Create tarball
  execSync(`tar -czf ${tmpFile} -T ${fileListPath}`, { cwd: directory });
  
  const archive = fs.readFileSync(tmpFile);
  
  // Cleanup
  fs.unlinkSync(tmpFile);
  fs.unlinkSync(fileListPath);
  
  return archive;
}

function getAllFiles(dir: string, ig: ReturnType<typeof ignore>, rootDir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);

    if (ig.ignores(relativePath)) continue;

    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, ig, rootDir));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

async function watchAndDeploy(projectId: string, serviceId: string): Promise<void> {
  const chokidar = await import('chokidar');
  
  log.info('Watching for changes...');
  log.dim('Press Ctrl+C to stop');
  log.newline();

  let debounceTimer: NodeJS.Timeout | null = null;
  let isDeploying = false;

  const watcher = chokidar.default.watch('.', {
    ignored: [
      /(^|[\/\\])\../,  // Dotfiles
      'node_modules',
      '*.log',
      '.git',
    ],
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on('all', (_event, filePath) => {
    if (isDeploying) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      isDeploying = true;
      log.dim(`Change detected: ${filePath}`);
      await runDeploy(projectId, serviceId, `Auto-deploy: ${filePath}`);
      isDeploying = false;
      log.newline();
      log.info('Watching for changes...');
    }, 500);
  });

  // Initial deploy
  await runDeploy(projectId, serviceId, 'Initial deploy');
  log.newline();
  log.info('Watching for changes...');
}
