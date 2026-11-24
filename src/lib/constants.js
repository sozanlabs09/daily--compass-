
export const APP_NAME = 'Daily Compass';

export const APP_VERSION = '1.0.0';

export const APP_SECTIONS = Object.freeze([
  Object.freeze({ id: 'dashboard', label: 'Dashboard' }),
  Object.freeze({ id: 'tasks', label: 'Tasks' }),
  Object.freeze({ id: 'subjects', label: 'Subjects' }),
  Object.freeze({ id: 'books', label: 'Books' }),
  Object.freeze({ id: 'notebook', label: 'Notebook' }),
  Object.freeze({ id: 'habits', label: 'Habits' }),
  Object.freeze({ id: 'calendar', label: 'Calendar' })
]);

export const TASK_STATUSES = Object.freeze({
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
});

export const BOOK_STATUSES = Object.freeze({
  TO_READ: 'to_read',
  READING: 'reading',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold'
});

export const HABIT_FREQUENCIES = Object.freeze({
  DAILY: 'daily',
  WEEKLY: 'weekly',
  CUSTOM: 'custom'
});

export const CALENDAR_EVENT_STATUSES = Object.freeze({
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
});

export const SUBSCRIPTION_STATUSES = Object.freeze({
  FREE: 'free',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  PENDING: 'pending'
});

export const SUPPORTED_LANGUAGES = Object.freeze([
  'en',
  'ar'
]);

export const SUPPORTED_THEMES = Object.freeze([
  'light',
  'dark',
  'system'
]);

export const DEFAULT_LANGUAGE = 'en';

export const DEFAULT_THEME = 'light';

// Currency is selected from user settings.
// Do not assume one currency for every user.
export const DEFAULT_CURRENCY = null;

export const MAX_TEXT_LENGTH = 500;

export const MAX_DISPLAY_NAME_LENGTH = 40;
