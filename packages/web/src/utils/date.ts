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
