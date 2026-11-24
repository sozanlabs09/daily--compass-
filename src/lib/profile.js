
import { supabase, isSupabaseConfigured } from './supabase.js';

function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

export async function getMyProfile() {
  try {
    const client = getSupabaseClient();

    const { data: authData, error: authError } =
      await client.auth.getUser();

    if (authError) throw authError;

    const user = authData.user;

    if (!user) {
      throw new Error('You must be logged in.');
    }

    const { data, error } = await client
      .from('profiles')
      .select('id, display_name, avatar_url, plan, subscription_expires_at, created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    return { profile: data, error: null };
  } catch (error) {
    return { profile: null, error };
  }
}

export async function updateMyProfile(updates) {
  try {
    const client = getSupabaseClient();

    const { data: authData, error: authError } =
      await client.auth.getUser();

    if (authError) throw authError;

    const user = authData.user;

    if (!user) {
      throw new Error('You must be logged in.');
    }

    const allowedFields = ['display_name', 'avatar_url'];

    const safeUpdates = {};

    for (const field of allowedFields) {
      if (Object.hasOwn(updates, field)) {
        safeUpdates[field] = updates[field];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      throw new Error('No valid profile fields were provided.');
    }

    safeUpdates.updated_at = new Date().toISOString();

    const { data, error } = await client
      .from('profiles')
      .update(safeUpdates)
      .eq('id', user.id)
      .select('id, display_name, avatar_url, plan, subscription_expires_at, created_at, updated_at')
      .single();

    if (error) throw error;

    return { profile: data, error: null };
  } catch (error) {
    return { profile: null, error };
  }
}
