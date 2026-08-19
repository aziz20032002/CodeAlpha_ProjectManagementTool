export function formatDate(dateString) {
  if (!dateString) return '—';

  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDueDate(dateString) {
  if (!dateString) return '';

  const dateOnly = String(dateString).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return formatDate(dateString);
  }

  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return '—';

  const date = new Date(dateString);
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${datePart} · ${timePart}`;
}
