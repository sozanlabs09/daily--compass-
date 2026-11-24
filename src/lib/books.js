
import { supabase, isSupabaseConfigured } from './supabase.js';

const BOOK_FIELDS = `
  id,
  user_id,
  title,
  author,
  description,
  status,
  created_at,
  updated_at
`;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BOOK_STATUSES = [
  'to_read',
  'reading',
  'completed',
  'on_hold'
];

const ALLOWED_FIELDS = [
  'title',
  'author',
  'description',
  'status'
];

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
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

function validateBook(data, { partial = false } = {}) {
  if (!isPlainObject(data)) {
    throw new Error('Invalid book data.');
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
        'Book title must be between 1 and 200 characters.'
      );
    }
  }

  if (Object.hasOwn(data, 'author')) {
    if (
      typeof data.author !== 'string' ||
      data.author.trim().length > 150
    ) {
      throw new Error('Invalid author name.');
    }
  }

  if (Object.hasOwn(data, 'description')) {
    if (
      typeof data.description !== 'string' ||
      data.description.trim().length > 5000
    ) {
      throw new Error('Invalid book description.');
    }
  }

  if (
    Object.hasOwn(data, 'status') &&
    !BOOK_STATUSES.includes(data.status)
  ) {
    throw new Error('Invalid book status.');
  }
}

function validateBookId(bookId) {
  if (
    typeof bookId !== 'string' ||
    !UUID_PATTERN.test(bookId)
  ) {
    throw new Error('Invalid book ID.');
  }
}

export async function getMyBooks() {
  try {
    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('books')
      .select(BOOK_FIELDS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      books: data ?? [],
      error: null
    };
  } catch (error) {
    return {
      books: [],
      error
    };
  }
}

export async function createBook(bookData) {
  try {
    validateBook(bookData);

    const { client, user } = await getAuthenticatedClient();

    const newBook = {
      user_id: user.id,
      title: bookData.title.trim(),
      author: bookData.author?.trim() ?? '',
      description: bookData.description?.trim() ?? '',
      status: bookData.status ?? 'to_read'
    };

    const { data, error } = await client
      .from('books')
      .insert(newBook)
      .select(BOOK_FIELDS)
      .single();

    if (error) throw error;

    return {
      book: data,
      error: null
    };
  } catch (error) {
    return {
      book: null,
      error
    };
  }
}

export async function updateBook(bookId, updates) {
  try {
    validateBookId(bookId);
    validateBook(updates, { partial: true });

    if (Object.keys(updates).length === 0) {
      throw new Error('No book updates were provided.');
    }

    const safeUpdates = {};

    for (const field of ALLOWED_FIELDS) {
      if (Object.hasOwn(updates, field)) {
        const value = updates[field];

        safeUpdates[field] =
          typeof value === 'string'
            ? value.trim()
            : value;
      }
    }

    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('books')
      .update(safeUpdates)
      .eq('id', bookId)
      .eq('user_id', user.id)
      .select(BOOK_FIELDS)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Book not found.');

    return {
      book: data,
      error: null
    };
  } catch (error) {
    return {
      book: null,
      error
    };
  }
}

export async function deleteBook(bookId) {
  try {
    validateBookId(bookId);

    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('books')
      .delete()
      .eq('id', bookId)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Book not found.');

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
