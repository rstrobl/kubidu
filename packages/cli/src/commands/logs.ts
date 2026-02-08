import { Command } from 'commander';
import WebSocket from 'ws';
import chalk from 'chalk';
import api from '../lib/api';
import { log, createSpinner } from '../utils/output';
import { requireService } from '../utils/require-auth';

export const logsCommand = new Command('logs')
  .description('View deployment logs')
  .option('-f, --follow', 'Follow log output')
  .option('-n, --lines <n>', 'Number of lines to show', '100')
  .option('--since <time>', 'Show logs since timestamp (e.g., 1h, 30m, 2024-01-01)')
  .action(async (options) => {
    const { projectId, serviceId } = requireService();

    if (options.follow) {
      await streamLogs(projectId, serviceId);
    } else {
      await fetchLogs(projectId, serviceId, parseInt(options.lines, 10));
    }
  });

async function fetchLogs(projectId: string, serviceId: string, lines: number): Promise<void> {
  const spinner = createSpinner('Fetching logs...').start();

  try {
    const logs = await api.getLogs(projectId, serviceId, lines);
    spinner.stop();

    if (logs.length === 0) {
      log.info('No logs available.');
      return;
    }

    for (const entry of logs) {
      printLogEntry(entry);
    }

    log.newline();
    log.dim(`Showing ${logs.length} log entries. Use -f to stream live.`);

  } catch (error: any) {
    spinner.fail('Failed to fetch logs');
    log.error(error.message);
    process.exit(1);
  }
}

async function streamLogs(projectId: string, serviceId: string): Promise<void> {
  log.info('Streaming logs... (Ctrl+C to stop)');
  log.newline();

  const wsUrl = api.getLogsStreamUrl(projectId, serviceId);

  const ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    log.dim('Connected to log stream');
  });

  ws.on('message', (data) => {
    try {
      const entry = JSON.parse(data.toString());
      printLogEntry(entry);
    } catch {
      // Raw log line
      console.log(data.toString());
    }
  });

  ws.on('error', (error) => {
    log.error(`WebSocket error: ${error.message}`);
  });

  ws.on('close', () => {
    log.dim('Log stream disconnected');
    process.exit(0);
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    log.newline();
    log.dim('Closing log stream...');
    ws.close();
    process.exit(0);
  });
}

function printLogEntry(entry: { timestamp: string; level: string; message: string; source?: string }): void {
  const timestamp = formatTimestamp(entry.timestamp);
  const level = formatLevel(entry.level);
  const source = entry.source ? chalk.dim(`[${entry.source}] `) : '';
  
  console.log(`${timestamp} ${level} ${source}${entry.message}`);
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const time = date.toLocaleTimeString('en-US', { hour12: false });
  return chalk.dim(time);
}

function formatLevel(level: string): string {
  const colors: Record<string, typeof chalk.green> = {
    error: chalk.red,
    err: chalk.red,
    warn: chalk.yellow,
    warning: chalk.yellow,
    info: chalk.blue,
    debug: chalk.gray,
    trace: chalk.gray,
  };

  const colorFn = colors[level.toLowerCase()] || chalk.white;
  return colorFn(level.toUpperCase().padEnd(5));
}
