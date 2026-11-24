const STORAGE_PREFIX = 'daily-compass:';

export function saveLocalData(key, value) {
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${key}`,
      JSON.stringify(value)
    );

    return true;
  } catch (error) {
    console.error('Failed to save local data:', error);
    return false;
  }
}

export function readLocalData(key, fallback = null) {
  try {
    const storedValue = localStorage.getItem(
      `${STORAGE_PREFIX}${key}`
    );

    if (storedValue === null) {
      return fallback;
    }

    return JSON.parse(storedValue);
  } catch (error) {
    console.error('Failed to read local data:', error);
    return fallback;
  }
}

export function removeLocalData(key) {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    return true;
  } catch (error) {
    console.error('Failed to remove local data:', error);
    return false;
  }
      }
