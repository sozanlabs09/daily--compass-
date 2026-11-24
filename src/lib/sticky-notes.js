
import { supabase, isSupabaseConfigured } from './supabase.js';

const STICKY_NOTE_FIELDS = `
  id,
  user_id,
  page_id,
  content,
  color,
  created_at,
  updated_at
`;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_FIELDS = ['content', 'color'];
const MAX_CONTENT_LENGTH = 2000;

const NOTE_COLORS = [
  'yellow',
  'pink',
  'blue',
  'green',
  'purple'
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

function validateId(id, label) {
  if (
    typeof id !== 'string' ||
    !UUID_PATTERN.test(id)
  ) {
    throw new Error(`Invalid ${label}.`);
  }
}

function validateStickyNote(data, { partial = false } = {}) {
  if (!isPlainObject(data)) {
    throw new Error('Invalid sticky note data.');
  }

  const fields = Object.keys(data);

  if (fields.length === 0) {
    throw new Error('No sticky note data was provided.');
  }

  for (const field of fields) {
    if (!ALLOWED_FIELDS.includes(field)) {
      throw new Error(`Field "${field}" is not allowed.`);
    }
  }

  if (!partial || Object.hasOwn(data, 'content')) {
    if (
      typeof data.content !== 'string' ||
      !data.content.trim() ||
      data.content.trim().length > MAX_CONTENT_LENGTH
    ) {
      throw new Error(
        `Sticky note content must be between 1 and ${MAX_CONTENT_LENGTH} characters.`
      );
    }
  }

  if (
    Object.hasOwn(data, 'color') &&
    !NOTE_COLORS.includes(data.color)
  ) {
    throw new Error('Invalid sticky note color.');
  }
}

async function verifyPageOwnership(client, userId, pageId) {
  const { data, error } = await client
    .from('notebook_pages')
    .select('id, notebook_id')
    .eq('id', pageId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Notebook page not found.');

  const { data: notebook, error: notebookError } = await client
    .from('notebooks')
    .select('id')
    .eq('id', data.notebook_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (notebookError) throw notebookError;
  if (!notebook) throw new Error('Notebook not found.');

  return data;
}

async function getOwnedStickyNote(client, userId, noteId) {
  const { data, error } = await client
    .from('sticky_notes')
    .select('id, page_id')
    .eq('id', noteId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Sticky note not found.');

  return data;
}

export async function getStickyNotes(pageId) {
  try {
    validateId(pageId, 'page ID');

    const { client, user } = await getAuthenticatedClient();

    await verifyPageOwnership(client, user.id, pageId);

    const { data, error } = await client
      .from('sticky_notes')
      .select(STICKY_NOTE_FIELDS)
      .eq('page_id', pageId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return {
      notes: data ?? [],
      error: null
    };
  } catch (error) {
    return {
      notes: [],
      error
    };
  }
}

export async function createStickyNote(pageId, noteData) {
  try {
    validateId(pageId, 'page ID');
    validateStickyNote(noteData);

    const { client, user } = await getAuthenticatedClient();

    await verifyPageOwnership(client, user.id, pageId);

    const newNote = {
      user_id: user.id,
      page_id: pageId,
      content: noteData.content.trim(),
      color: noteData.color ?? 'yellow'
    };

    const { data, error } = await client
      .from('sticky_notes')
      .insert(newNote)
      .select(STICKY_NOTE_FIELDS)
      .single();

    if (error) throw error;

    return {
      note: data,
      error: null
    };
  } catch (error) {
    return {
      note: null,
      error
    };
  }
}

export async function updateStickyNote(noteId, updates) {
  try {
    validateId(noteId, 'sticky note ID');
    validateStickyNote(updates, { partial: true });

    const safeUpdates = {};

    if (Object.hasOwn(updates, 'content')) {
      safeUpdates.content = updates.content.trim();
    }

    if (Object.hasOwn(updates, 'color')) {
      safeUpdates.color = updates.color;
    }

    const { client, user } = await getAuthenticatedClient();

    const existingNote = await getOwnedStickyNote(
      client,
      user.id,
      noteId
    );

    await verifyPageOwnership(
      client,
      user.id,
      existingNote.page_id
    );

    const { data, error } = await client
      .from('sticky_notes')
      .update(safeUpdates)
      .eq('id', noteId)
      .eq('user_id', user.id)
      .eq('page_id', existingNote.page_id)
      .select(STICKY_NOTE_FIELDS)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Sticky note not found.');

    return {
      note: data,
      error: null
    };
  } catch (error) {
    return {
      note: null,
      error
    };
  }
}

export async function deleteStickyNote(noteId) {
  try {
    validateId(noteId, 'sticky note ID');

    const { client, user } = await getAuthenticatedClient();

    const existingNote = await getOwnedStickyNote(
      client,
      user.id,
      noteId
    );

    await verifyPageOwnership(
      client,
      user.id,
      existingNote.page_id
    );

    const { data, error } = await client
      .from('sticky_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', user.id)
      .eq('page_id', existingNote.page_id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Sticky note not found.');

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
