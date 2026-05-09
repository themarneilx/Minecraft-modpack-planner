export function formatLastUpdatedAt(
  value: string | Date | null,
  locale?: string,
  timeZone?: string,
) {
  if (!value) {
    return 'No updates yet';
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'No updates yet';
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}
