import chalk from 'chalk';
import ora, { Ora } from 'ora';

export const log = {
  info: (message: string) => console.log(chalk.blue('ℹ'), message),
  success: (message: string) => console.log(chalk.green('✔'), message),
  warning: (message: string) => console.log(chalk.yellow('⚠'), message),
  error: (message: string) => console.error(chalk.red('✖'), message),
  dim: (message: string) => console.log(chalk.dim(message)),
  
  // Styled outputs
  header: (message: string) => console.log(chalk.bold.underline(message)),
  link: (url: string) => chalk.cyan.underline(url),
  code: (text: string) => chalk.cyan(`\`${text}\``),
  
  // Empty line
  newline: () => console.log(),
};

export function createSpinner(text: string): Ora {
  return ora({
    text,
    spinner: 'dots',
    color: 'cyan',
  });
}

export function formatTable(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) => {
    const maxRowWidth = Math.max(...rows.map(row => (row[i] || '').length));
    return Math.max(h.length, maxRowWidth);
  });

  const headerRow = headers
    .map((h, i) => chalk.bold(h.padEnd(colWidths[i])))
    .join('  ');

  const separator = colWidths.map(w => '─'.repeat(w)).join('──');

  const dataRows = rows
    .map(row =>
      row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join('  ')
    )
    .join('\n');

  return `${headerRow}\n${separator}\n${dataRows}`;
}

export function formatStatus(status: string): string {
  const statusColors: Record<string, typeof chalk.green> = {
    running: chalk.green,
    success: chalk.green,
    active: chalk.green,
    pending: chalk.yellow,
    building: chalk.yellow,
    deploying: chalk.yellow,
    failed: chalk.red,
    stopped: chalk.gray,
  };

  const colorFn = statusColors[status.toLowerCase()] || chalk.white;
  return colorFn(status);
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

export function box(content: string, title?: string): string {
  const lines = content.split('\n');
  const maxWidth = Math.max(...lines.map(l => l.length), (title || '').length + 4);
  
  const top = title 
    ? `╭─ ${title} ${'─'.repeat(maxWidth - title.length - 3)}╮`
    : `╭${'─'.repeat(maxWidth + 2)}╮`;
  
  const bottom = `╰${'─'.repeat(maxWidth + 2)}╯`;
  
  const paddedLines = lines
    .map(l => `│ ${l.padEnd(maxWidth)} │`)
    .join('\n');

  return `${top}\n${paddedLines}\n${bottom}`;
}
