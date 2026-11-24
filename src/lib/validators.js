const CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function isValidEmail(email) {
  if (typeof email !== 'string') return false;

  const value = email.trim();

  if (value.length === 0 || value.length > 254) {
    return false;
  }

  const parts = value.split('@');

  if (parts.length !== 2) return false;

  const [local, domain] = parts;

  if (
    local.length === 0 ||
    local.length > 64 ||
    domain.length === 0 ||
    !domain.includes('.')
  ) {
    return false;
  }

  if (
    !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local) ||
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..')
  ) {
    return false;
  }

  const labels = domain.split('.');

  return labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?$/i.test(label)
  );
}

export function isValidPassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    password.length <= 128 &&
    !/[\u0000-\u001F\u007F]/.test(password)
  );
}

export function isValidText(value, maxLength = 500) {
  return (
    typeof value === 'string' &&
    Number.isInteger(maxLength) &&
    maxLength > 0 &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength &&
    !CONTROL_CHARACTERS.test(value)
  );
}

export function isValidDate(value) {
  if (
    typeof value !== 'string' &&
    !(value instanceof Date)
  ) {
    return false;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

export function isValidNumber(
  value,
  { min = -Infinity, max = Infinity } = {}
) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

export function sanitizeText(value, maxLength = 500) {
  if (
    typeof value !== 'string' ||
    !Number.isInteger(maxLength) ||
    maxLength < 0
  ) {
    return '';
  }

  return value
    .replace(CONTROL_CHARACTERS, '')
    .trim()
    .slice(0, maxLength);
    }
