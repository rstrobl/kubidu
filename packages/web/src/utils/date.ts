export interface FormatDistanceOptions {
  style?: 'short' | 'long';
}

export function formatDistanceToNow(date: Date, options: FormatDistanceOptions = {}): string {
  const { style = 'short' } = options;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return style === 'long'
      ? `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`
      : `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return style === 'long'
      ? `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
      : `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return style === 'long'
      ? `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
      : `${diffInDays}d ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return style === 'long'
      ? `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`
      : `${diffInWeeks}w ago`;
  }

  // For older dates, show the formatted date
  if (style === 'long') {
    return new Date(date).toLocaleDateString();
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mo ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date using a format string (simplified date-fns compatible)
 * Supported tokens: yyyy, MM, MMM, dd, HH, mm, ss
 */
export function format(date: Date, formatStr: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const tokens: Record<string, string> = {
    'yyyy': date.getFullYear().toString(),
    'MM': pad(date.getMonth() + 1),
    'MMM': months[date.getMonth()],
    'dd': pad(date.getDate()),
    'd': date.getDate().toString(),
    'HH': pad(date.getHours()),
    'mm': pad(date.getMinutes()),
    'ss': pad(date.getSeconds()),
  };

  let result = formatStr;
  // Sort by length descending to match longer patterns first
  Object.entries(tokens)
    .sort((a, b) => b[0].length - a[0].length)
    .forEach(([token, value]) => {
      result = result.replace(new RegExp(token, 'g'), value);
    });

  return result;
}
