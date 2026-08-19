import { formatDate } from './formatDate';

export function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (elapsedSeconds < 60) return 'Just now';

  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  if (hours < 48) return 'Yesterday';

  return formatDate(dateString);
}
