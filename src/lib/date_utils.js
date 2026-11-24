
function parseLocalDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : new Date(value.getTime());
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const dateOnlyMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    if (
      date.getFullYear() !== Number(year) ||
      date.getMonth() !== Number(month) - 1 ||
      date.getDate() !== Number(day)
    ) {
      return null;
    }

    return date;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function getTodayDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatDate(
  value,
  {
    locale = 'en',
    options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }
  } = {}
) {
  const date = parseLocalDate(value);

  if (!date) return '';

  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return '';
  }
}

export function isValidDate(value) {
  return parseLocalDate(value) !== null;
}

export function addDays(value, amount) {
  const date = parseLocalDate(value);

  if (!date || !Number.isInteger(amount)) {
    return null;
  }

  date.setDate(date.getDate() + amount);

  return date;
}

export function getStartOfDay(value = new Date()) {
  const date = parseLocalDate(value);

  if (!date) return null;

  date.setHours(0, 0, 0, 0);

  return date;
}

export function getEndOfDay(value = new Date()) {
  const date = parseLocalDate(value);

  if (!date) return null;

  date.setHours(23, 59, 59, 999);

  return date;
}

export function isSameDay(first, second) {
  const a = parseLocalDate(first);
  const b = parseLocalDate(second);

  if (!a || !b) return false;

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getDaysBetween(start, end) {
  const first = parseLocalDate(start);
  const second = parseLocalDate(end);

  if (!first || !second) return null;

  const firstUtc = Date.UTC(
    first.getFullYear(),
    first.getMonth(),
    first.getDate()
  );

  const secondUtc = Date.UTC(
    second.getFullYear(),
    second.getMonth(),
    second.getDate()
  );

  return Math.round(
    (secondUtc - firstUtc) / 86400000
  );
}
