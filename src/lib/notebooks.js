
import { supabase, isSupabaseConfigured } from './supabase.js';

const NOTEBOOK_FIELDS = `
  id,
  user_id,
  title,
  created_at,
  updated_at
`;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_FIELDS = ['title'];
const MAX_TITLE_LENGTH = 120;

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

function validateNotebook(data, { partial = false } = {}) {
  if (!isPlainObject(data)) {
    throw new Error('Invalid notebook data.');
  }

  const fields = Object.keys(data);

  if (fields.length === 0) {
    throw new Error('No notebook data was provided.');
  }

  for (const field of fields) {
    if (!ALLOWED_FIELDS.includes(field)) {
      throw new Error(`Field "${field}" is not allowed.`);
    }
  }

  if (!partial || Object.hasOwn(data, 'title')) {
    if (
      typeof data.title !== 'string' ||
      !data.title.trim() ||
      data.title.trim().length > MAX_TITLE_LENGTH
    ) {
      throw new Error(
        `Notebook title must be between 1 and ${MAX_TITLE_LENGTH} characters.`
      );
    }
  }
}

function validateNotebookId(notebookId) {
  if (
    typeof notebookId !== 'string' ||
    !UUID_PATTERN.test(notebookId)
  ) {
    throw new Error('Invalid notebook ID.');
  }
}

export async function getMyNotebooks() {
  try {
    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('notebooks')
      .select(NOTEBOOK_FIELDS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return {
      notebooks: data ?? [],
      error: null
    };
  } catch (error) {
    return {
      notebooks: [],
      error
    };
  }
}

export async function createNotebook(notebookData) {
  try {
    validateNotebook(notebookData);

    const { client, user } = await getAuthenticatedClient();

    const newNotebook = {
      user_id: user.id,
      title: notebookData.title.trim()
    };

    const { data, error } = await client
      .from('notebooks')
      .insert(newNotebook)
      .select(NOTEBOOK_FIELDS)
      .single();

    if (error) throw error;

    return {
      notebook: data,
      error: null
    };
  } catch (error) {
    return {
      notebook: null,
      error
    };
  }
}

export async function updateNotebook(notebookId, updates) {
  try {
    validateNotebookId(notebookId);
    validateNotebook(updates, { partial: true });

    const safeUpdates = {};

    if (Object.hasOwn(updates, 'title')) {
      safeUpdates.title = updates.title.trim();
    }

    if (Object.keys(safeUpdates).length === 0) {
      throw new Error('No valid notebook updates were provided.');
    }

    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('notebooks')
      .update(safeUpdates)
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .select(NOTEBOOK_FIELDS)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Notebook not found.');

    return {
      notebook: data,
      error: null
    };
  } catch (error) {
    return {
      notebook: null,
      error
    };
  }
}

export async function deleteNotebook(notebookId) {
  try {
    validateNotebookId(notebookId);

    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('notebooks')
      .delete()
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Notebook not found.');

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
