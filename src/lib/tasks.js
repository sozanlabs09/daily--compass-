
import { supabase, isSupabaseConfigured } from './supabase.js';

const TASK_STATUSES = ['todo', 'in_progress', 'completed'];
const TASK_PRIORITIES = ['low', 'medium', 'high'];

const ALLOWED_FIELDS = [
  'title',
  'description',
  'subject_id',
  'due_date',
  'status',
  'priority'
];

const TASK_FIELDS = `
  id,
  user_id,
  subject_id,
  title,
  description,
  due_date,
  status,
  priority,
  created_at,
  updated_at
`;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function validateTask(data, { partial = false } = {}) {
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    throw new Error('Invalid task data.');
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
      data.title.trim().length > 500
    ) {
      throw new Error(
        'Task title must be between 1 and 500 characters.'
      );
    }
  }

  if (Object.hasOwn(data, 'description')) {
    if (
      typeof data.description !== 'string' ||
      data.description.length > 5000
    ) {
      throw new Error('Invalid task description.');
    }
  }

  if (
    Object.hasOwn(data, 'status') &&
    !TASK_STATUSES.includes(data.status)
  ) {
    throw new Error('Invalid task status.');
  }

  if (
    Object.hasOwn(data, 'priority') &&
    !TASK_PRIORITIES.includes(data.priority)
  ) {
    throw new Error('Invalid task priority.');
  }

  if (
    Object.hasOwn(data, 'subject_id') &&
    data.subject_id !== null &&
    (
      typeof data.subject_id !== 'string' ||
      !UUID_PATTERN.test(data.subject_id)
    )
  ) {
    throw new Error('Invalid subject ID.');
  }

  if (
    Object.hasOwn(data, 'due_date') &&
    data.due_date !== null &&
    !isValidDateOnly(data.due_date)
  ) {
    throw new Error('Invalid due date.');
  }
}

function validateTaskId(taskId) {
  if (
    typeof taskId !== 'string' ||
    !UUID_PATTERN.test(taskId)
  ) {
    throw new Error('Invalid task ID.');
  }
}

export async function getMyTasks() {
  try {
    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('tasks')
      .select(TASK_FIELDS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { tasks: data ?? [], error: null };
  } catch (error) {
    return { tasks: [], error };
  }
}

export async function createTask(taskData) {
  try {
    validateTask(taskData);

    const { client, user } = await getAuthenticatedClient();

    const newTask = {
      user_id: user.id,
      title: taskData.title.trim(),
      description: taskData.description?.trim() ?? '',
      subject_id: taskData.subject_id ?? null,
      due_date: taskData.due_date ?? null,
      status: taskData.status ?? 'todo',
      priority: taskData.priority ?? 'medium'
    };

    const { data, error } = await client
      .from('tasks')
      .insert(newTask)
      .select(TASK_FIELDS)
      .single();

    if (error) throw error;

    return { task: data, error: null };
  } catch (error) {
    return { task: null, error };
  }
}

export async function updateTask(taskId, updates) {
  try {
    validateTaskId(taskId);
    validateTask(updates, { partial: true });

    if (Object.keys(updates).length === 0) {
      throw new Error('No task updates were provided.');
    }

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

    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('tasks')
      .update(safeUpdates)
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select(TASK_FIELDS)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Task not found.');

    return { task: data, error: null };
  } catch (error) {
    return { task: null, error };
  }
}

export async function deleteTask(taskId) {
  try {
    validateTaskId(taskId);

    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Task not found.');

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error };
  }
}
