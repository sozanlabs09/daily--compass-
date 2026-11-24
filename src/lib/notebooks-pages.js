
import { supabase, isSupabaseConfigured } from './supabase.js';

const PAGE_FIELDS = `
  id,
  user_id,
  notebook_id,
  title,
  content,
  created_at,
  updated_at
`;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_FIELDS = ['title', 'content'];
const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 100000;

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
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    throw new Error(`Invalid ${label}.`);
  }
}

function validatePage(data, { partial = false } = {}) {
  if (!isPlainObject(data)) {
    throw new Error('Invalid notebook page data.');
  }

  const fields = Object.keys(data);

  if (fields.length === 0) {
    throw new Error('No page data was provided.');
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
        `Page title must be between 1 and ${MAX_TITLE_LENGTH} characters.`
      );
    }
  }

  if (Object.hasOwn(data, 'content')) {
    if (
      typeof data.content !== 'string' ||
      data.content.length > MAX_CONTENT_LENGTH
    ) {
      throw new Error('Invalid page content.');
    }
  }
}

async function verifyNotebookOwnership(client, userId, notebookId) {
  const { data, error } = await client
    .from('notebooks')
    .select('id')
    .eq('id', notebookId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Notebook not found.');
}

async function getOwnedPage(client, userId, pageId) {
  const { data, error } = await client
    .from('notebook_pages')
    .select('id, notebook_id')
    .eq('id', pageId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Notebook page not found.');

  return data;
}

export async function getNotebookPages(notebookId) {
  try {
    validateId(notebookId, 'notebook ID');

    const { client, user } = await getAuthenticatedClient();

    await verifyNotebookOwnership(client, user.id, notebookId);

    const { data, error } = await client
      .from('notebook_pages')
      .select(PAGE_FIELDS)
      .eq('notebook_id', notebookId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return {
      pages: data ?? [],
      error: null
    };
  } catch (error) {
    return {
      pages: [],
      error
    };
  }
}

export async function createNotebookPage(notebookId, pageData) {
  try {
    validateId(notebookId, 'notebook ID');
    validatePage(pageData);

    const { client, user } = await getAuthenticatedClient();

    await verifyNotebookOwnership(client, user.id, notebookId);

    const newPage = {
      user_id: user.id,
      notebook_id: notebookId,
      title: pageData.title.trim(),
      content: pageData.content ?? ''
    };

    const { data, error } = await client
      .from('notebook_pages')
      .insert(newPage)
      .select(PAGE_FIELDS)
      .single();

    if (error) throw error;

    return {
      page: data,
      error: null
    };
  } catch (error) {
    return {
      page: null,
      error
    };
  }
}

export async function updateNotebookPage(pageId, updates) {
  try {
    validateId(pageId, 'page ID');
    validatePage(updates, { partial: true });

    const safeUpdates = {};

    if (Object.hasOwn(updates, 'title')) {
      safeUpdates.title = updates.title.trim();
    }

    if (Object.hasOwn(updates, 'content')) {
      safeUpdates.content = updates.content;
    }

    const { client, user } = await getAuthenticatedClient();

    const existingPage = await getOwnedPage(
      client,
      user.id,
      pageId
    );

    await verifyNotebookOwnership(
      client,
      user.id,
      existingPage.notebook_id
    );

    const { data, error } = await client
      .from('notebook_pages')
      .update(safeUpdates)
      .eq('id', pageId)
      .eq('user_id', user.id)
      .eq('notebook_id', existingPage.notebook_id)
      .select(PAGE_FIELDS)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Notebook page not found.');

    return {
      page: data,
      error: null
    };
  } catch (error) {
    return {
      page: null,
      error
    };
  }
}

export async function deleteNotebookPage(pageId) {
  try {
    validateId(pageId, 'page ID');

    const { client, user } = await getAuthenticatedClient();

    const existingPage = await getOwnedPage(
      client,
      user.id,
      pageId
    );

    await verifyNotebookOwnership(
      client,
      user.id,
      existingPage.notebook_id
    );

    const { data, error } = await client
      .from('notebook_pages')
      .delete()
      .eq('id', pageId)
      .eq('user_id', user.id)
      .eq('notebook_id', existingPage.notebook_id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Notebook page not found.');

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
