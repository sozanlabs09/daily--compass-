
function isValidFractionDigits(value) {
  return (
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 20
  );
}

export function formatNumber(
  value,
  {
    locale = 'en',
    maximumFractionDigits = 2
  } = {}
) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !isValidFractionDigits(maximumFractionDigits)
  ) {
    return '';
  }

  try {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits
    }).format(value);
  } catch {
    return '';
  }
}

export function formatCurrency(
  value,
  {
    locale = 'en',
    currency = 'USD',
    maximumFractionDigits
  } = {}
) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    typeof currency !== 'string' ||
    !/^[A-Z]{3}$/.test(currency)
  ) {
    return '';
  }

  if (
    maximumFractionDigits !== undefined &&
    !isValidFractionDigits(maximumFractionDigits)
  ) {
    return '';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      ...(maximumFractionDigits !== undefined
        ? { maximumFractionDigits }
        : {})
    }).format(value);
  } catch {
    return '';
  }
}

export function formatPercentage(
  value,
  {
    locale = 'en',
    maximumFractionDigits = 1
  } = {}
) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !isValidFractionDigits(maximumFractionDigits)
  ) {
    return '';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits
    }).format(value);
  } catch {
    return '';
  }
}

export function capitalize(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return '';
  }

  const text = value.trim();

  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function truncateText(value, maxLength = 100) {
  if (
    typeof value !== 'string' ||
    !Number.isInteger(maxLength) ||
    maxLength < 1
  ) {
    return '';
  }

  const text = value.trim();
  const characters = Array.from(text);

  if (characters.length <= maxLength) {
    return text;
  }

  if (maxLength === 1) {
    return '…';
  }

  return `${characters
    .slice(0, maxLength - 1)
    .join('')
    .trimEnd()}…`;
}
