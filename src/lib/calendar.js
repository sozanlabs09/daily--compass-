
import { supabase, isSupabaseConfigured } from './supabase.js';

const EVENT_FIELDS = `
  id,
  user_id,
  title,
  description,
  start_at,
  end_at,
  status,
  created_at,
  updated_at
`;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ISO_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/;

const EVENT_STATUSES = [
  'scheduled',
  'completed',
  'cancelled'
];

const ALLOWED_FIELDS = [
  'title',
  'description',
  'start_at',
  'end_at',
  'status'
];

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

async function getAuthenticatedClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  if (!data.user) throw new Error('You must be logged in.');

  return {
    client: supabase,
    user: data.user
  };
}

function getDateTimeValue(value) {
  if (
    typeof value !== 'string' ||
    !ISO_DATE_TIME_PATTERN.test(value)
  ) {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
}

function validateEvent(data, { partial = false } = {}) {
  if (!isPlainObject(data)) {
    throw new Error('Invalid calendar event data.');
  }

  for (const field of Object.keys(data)) {
    if (!ALLOWED_FIELDS.includes(field)) {
      throw new Error(`Field "${field}" is not allowed.`);
    }
  }

  if (!partial || Object.hasOwn(data, 'title')) {
    if (
      typeof data.title !== 'string' ||
      !data.title.trim() ||
      data.title.trim().length > 200
    ) {
      throw new Error(
        'Event title must be between 1 and 200 characters.'
      );
    }
  }

  if (Object.hasOwn(data, 'description')) {
    if (
      typeof data.description !== 'string' ||
      data.description.length > 5000
    ) {
      throw new Error('Invalid event description.');
    }
  }

  if (
    Object.hasOwn(data, 'start_at') &&
    getDateTimeValue(data.start_at) === null
  ) {
    throw new Error('Invalid event start date.');
  }

  if (Object.hasOwn(data, 'end_at')) {
    if (
      data.end_at !== null &&
      getDateTimeValue(data.end_at) === null
    ) {
      throw new Error('Invalid event end date.');
    }
  }

  if (
    Object.hasOwn(data, 'status') &&
    !EVENT_STATUSES.includes(data.status)
  ) {
    throw new Error('Invalid event status.');
  }

  if (data.start_at && data.end_at) {
    const start = getDateTimeValue(data.start_at);
    const end = getDateTimeValue(data.end_at);

    if (end <= start) {
      throw new Error(
        'Event end must be later than its start.'
      );
    }
  }
}

function validateEventId(eventId) {
  if (
    typeof eventId !== 'string' ||
    !UUID_PATTERN.test(eventId)
  ) {
    throw new Error('Invalid event ID.');
  }
}

export async function getMyEvents() {
  try {
    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('calendar_events')
      .select(EVENT_FIELDS)
      .eq('user_id', user.id)
      .order('start_at', { ascending: true });

    if (error) throw error;

    return {
      events: data ?? [],
      error: null
    };
  } catch (error) {
    return {
      events: [],
      error
    };
  }
}

export async function createEvent(eventData) {
  try {
    validateEvent(eventData);

    if (!Object.hasOwn(eventData, 'start_at')) {
      throw new Error('Event start date is required.');
    }

    const { client, user } = await getAuthenticatedClient();

    const newEvent = {
      user_id: user.id,
      title: eventData.title.trim(),
      description: eventData.description?.trim() ?? '',
      start_at: eventData.start_at,
      end_at: eventData.end_at ?? null,
      status: eventData.status ?? 'scheduled'
    };

    const { data, error } = await client
      .from('calendar_events')
      .insert(newEvent)
      .select(EVENT_FIELDS)
      .single();

    if (error) throw error;

    return {
      event: data,
      error: null
    };
  } catch (error) {
    return {
      event: null,
      error
    };
  }
}

export async function updateEvent(eventId, updates) {
  try {
    validateEventId(eventId);
    validateEvent(updates, { partial: true });

    if (Object.keys(updates).length === 0) {
      throw new Error('No event updates were provided.');
    }

    const { client, user } = await getAuthenticatedClient();

    const { data: existingEvent, error: fetchError } = await client
      .from('calendar_events')
      .select('start_at, end_at')
      .eq('id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingEvent) throw new Error('Event not found.');

    const safeUpdates = {};

    for (const field of ALLOWED_FIELDS) {
      if (Object.hasOwn(updates, field)) {
        const value = updates[field];

        safeUpdates[field] =
          typeof value === 'string' &&
          ['title', 'description'].includes(field)
            ? value.trim()
            : value;
      }
    }

    const finalStart = Object.hasOwn(safeUpdates, 'start_at')
      ? safeUpdates.start_at
      : existingEvent.start_at;

    const finalEnd = Object.hasOwn(safeUpdates, 'end_at')
      ? safeUpdates.end_at
      : existingEvent.end_at;

    if (finalEnd !== null && finalEnd !== undefined) {
      const start = getDateTimeValue(finalStart);
      const end = getDateTimeValue(finalEnd);

      if (start === null || end === null || end <= start) {
        throw new Error(
          'Event end must be later than its start.'
        );
      }
    }

    const { data, error } = await client
      .from('calendar_events')
      .update(safeUpdates)
      .eq('id', eventId)
      .eq('user_id', user.id)
      .select(EVENT_FIELDS)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Event not found.');

    return {
      event: data,
      error: null
    };
  } catch (error) {
    return {
      event: null,
      error
    };
  }
}

export async function deleteEvent(eventId) {
  try {
    validateEventId(eventId);

    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Event not found.');

    return {
      success: true,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      error
    };
  }
}
