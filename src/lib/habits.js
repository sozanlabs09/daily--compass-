
import { supabase, isSupabaseConfigured } from './supabase.js';

const HABIT_FIELDS = `
  id,
  user_id,
  name,
  frequency,
  created_at,
  updated_at
`;

const HABIT_LOG_FIELDS = `
  id,
  user_id,
  habit_id,
  completed_on,
  created_at
`;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const HABIT_FREQUENCIES = ['daily', 'weekly', 'custom'];
const ALLOWED_HABIT_FIELDS = ['name', 'frequency'];

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

  return { client: supabase, user: data.user };
}

function validateHabit(data, { partial = false } = {}) {
  if (!isPlainObject(data)) {
    throw new Error('Invalid habit data.');
  }

  for (const field of Object.keys(data)) {
    if (!ALLOWED_HABIT_FIELDS.includes(field)) {
      throw new Error(`Field "${field}" is not allowed.`);
    }
  }

  if (!partial || Object.hasOwn(data, 'name')) {
    if (
      typeof data.name !== 'string' ||
      !data.name.trim() ||
      data.name.trim().length > 120
    ) {
      throw new Error(
        'Habit name must be between 1 and 120 characters.'
      );
    }
  }

  if (
    Object.hasOwn(data, 'frequency') &&
    !HABIT_FREQUENCIES.includes(data.frequency)
  ) {
    throw new Error('Invalid habit frequency.');
  }
}

function validateHabitId(habitId) {
  if (
    typeof habitId !== 'string' ||
    !UUID_PATTERN.test(habitId)
  ) {
    throw new Error('Invalid habit ID.');
  }
}

function isValidDateOnly(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export async function getMyHabits() {
  try {
    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('habits')
      .select(HABIT_FIELDS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { habits: data ?? [], error: null };
  } catch (error) {
    return { habits: [], error };
  }
}

export async function createHabit(habitData) {
  try {
    validateHabit(habitData);

    const { client, user } = await getAuthenticatedClient();

    const newHabit = {
      user_id: user.id,
      name: habitData.name.trim(),
      frequency: habitData.frequency ?? 'daily'
    };

    const { data, error } = await client
      .from('habits')
      .insert(newHabit)
      .select(HABIT_FIELDS)
      .single();

    if (error) throw error;

    return { habit: data, error: null };
  } catch (error) {
    return { habit: null, error };
  }
}

export async function updateHabit(habitId, updates) {
  try {
    validateHabitId(habitId);
    validateHabit(updates, { partial: true });

    if (Object.keys(updates).length === 0) {
      throw new Error('No habit updates were provided.');
    }

    const safeUpdates = {};

    for (const field of ALLOWED_HABIT_FIELDS) {
      if (Object.hasOwn(updates, field)) {
        const value = updates[field];

        safeUpdates[field] =
          field === 'name' ? value.trim() : value;
      }
    }

    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('habits')
      .update(safeUpdates)
      .eq('id', habitId)
      .eq('user_id', user.id)
      .select(HABIT_FIELDS)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Habit not found.');

    return { habit: data, error: null };
  } catch (error) {
    return { habit: null, error };
  }
}

export async function deleteHabit(habitId) {
  try {
    validateHabitId(habitId);

    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('habits')
      .delete()
      .eq('id', habitId)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Habit not found.');

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error };
  }
}

export async function getHabitLogs(habitId) {
  try {
    validateHabitId(habitId);

    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('habit_logs')
      .select(HABIT_LOG_FIELDS)
      .eq('habit_id', habitId)
      .eq('user_id', user.id)
      .order('completed_on', { ascending: false });

    if (error) throw error;

    return { logs: data ?? [], error: null };
  } catch (error) {
    return { logs: [], error };
  }
}

export async function logHabitCompletion(habitId, completedOn) {
  try {
    validateHabitId(habitId);

    if (!isValidDateOnly(completedOn)) {
      throw new Error('Invalid completion date.');
    }

    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('habit_logs')
      .upsert(
        {
          user_id: user.id,
          habit_id: habitId,
          completed_on: completedOn
        },
        {
          onConflict: 'habit_id,completed_on',
          ignoreDuplicates: true
        }
      )
      .select(HABIT_LOG_FIELDS)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        log: null,
        alreadyLogged: true,
        error: null
      };
    }

    return {
      log: data,
      alreadyLogged: false,
      error: null
    };
  } catch (error) {
    return {
      log: null,
      alreadyLogged: false,
      error
    };
  }
}

export async function deleteHabitLog(logId) {
  try {
    if (
      typeof logId !== 'string' ||
      !UUID_PATTERN.test(logId)
    ) {
      throw new Error('Invalid habit log ID.');
    }

    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('habit_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Habit log not found.');

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error };
  }
}
