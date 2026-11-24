
import { supabase, isSupabaseConfigured } from './supabase.js';

const SUBJECT_FIELDS = `
  id,
  user_id,
  name,
  description,
  color,
  created_at,
  updated_at
`;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const ALLOWED_FIELDS = ['name', 'description', 'color'];

async function getAuthenticatedClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  if (!data.user) throw new Error('You must be logged in.');

  return { client: supabase, user: data.user };
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function validateSubject(data, { partial = false } = {}) {
  if (!isPlainObject(data)) {
    throw new Error('Invalid subject data.');
  }

  for (const field of Object.keys(data)) {
    if (!ALLOWED_FIELDS.includes(field)) {
      throw new Error(`Field "${field}" is not allowed.`);
    }
  }

  if (!partial || Object.hasOwn(data, 'name')) {
    if (
      typeof data.name !== 'string' ||
      !data.name.trim() ||
      data.name.trim().length > 100
    ) {
      throw new Error(
        'Subject name must be between 1 and 100 characters.'
      );
    }
  }

  if (Object.hasOwn(data, 'description')) {
    if (
      typeof data.description !== 'string' ||
      data.description.length > 5000
    ) {
      throw new Error('Invalid subject description.');
    }
  }

  if (Object.hasOwn(data, 'color')) {
    if (
      typeof data.color !== 'string' ||
      !COLOR_PATTERN.test(data.color)
    ) {
      throw new Error('Subject color must be a valid HEX color.');
    }
  }
}

function validateSubjectId(subjectId) {
  if (
    typeof subjectId !== 'string' ||
    !UUID_PATTERN.test(subjectId)
  ) {
    throw new Error('Invalid subject ID.');
  }
}

export async function getMySubjects() {
  try {
    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('subjects')
      .select(SUBJECT_FIELDS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { subjects: data ?? [], error: null };
  } catch (error) {
    return { subjects: [], error };
  }
}

export async function createSubject(subjectData) {
  try {
    validateSubject(subjectData);

    const { client, user } = await getAuthenticatedClient();

    const newSubject = {
      user_id: user.id,
      name: subjectData.name.trim(),
      description: subjectData.description?.trim() ?? '',
      color: subjectData.color ?? '#3B82F6'
    };

    const { data, error } = await client
      .from('subjects')
      .insert(newSubject)
      .select(SUBJECT_FIELDS)
      .single();

    if (error) throw error;

    return { subject: data, error: null };
  } catch (error) {
    return { subject: null, error };
  }
}

export async function updateSubject(subjectId, updates) {
  try {
    validateSubjectId(subjectId);
    validateSubject(updates, { partial: true });

    if (Object.keys(updates).length === 0) {
      throw new Error('No subject updates were provided.');
    }

    const safeUpdates = {};

    for (const field of ALLOWED_FIELDS) {
      if (Object.hasOwn(updates, field)) {
        const value = updates[field];

        safeUpdates[field] =
          typeof value === 'string' &&
          ['name', 'description'].includes(field)
            ? value.trim()
            : value;
      }
    }

    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('subjects')
      .update(safeUpdates)
      .eq('id', subjectId)
      .eq('user_id', user.id)
      .select(SUBJECT_FIELDS)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Subject not found.');

    return { subject: data, error: null };
  } catch (error) {
    return { subject: null, error };
  }
}

export async function deleteSubject(subjectId) {
  try {
    validateSubjectId(subjectId);

    const { client, user } = await getAuthenticatedClient();

    const { data, error } = await client
      .from('subjects')
      .delete()
      .eq('id', subjectId)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Subject not found.');

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error };
  }
}
