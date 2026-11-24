
import { supabase, isSupabaseConfigured } from './supabase.js';

function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Authentication is not configured. Please configure Supabase first.'
    );
  }

  return supabase;
}

export async function signUp(email, password) {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password
    });

    if (error) throw error;

    return {
      user: data.user,
      session: data.session,
      error: null
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error
    };
  }
}

export async function signIn(email, password) {
  try {
    const client = getSupabaseClient();

    const { data, error } =
      await client.auth.signInWithPassword({
        email: email.trim(),
        password
      });

    if (error) throw error;

    return {
      user: data.user,
      session: data.session,
      error: null
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error
    };
  }
}

export async function signOut() {
  try {
    const client = getSupabaseClient();

    const { error } = await client.auth.signOut();

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function getCurrentUser() {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client.auth.getUser();

    if (error) throw error;

    return {
      user: data.user,
      error: null
    };
  } catch (error) {
    return {
      user: null,
      error
    };
  }
}

export function onAuthStateChange(callback) {
  try {
    const client = getSupabaseClient();

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange(
      (event, session) => {
        callback({
          event,
          session,
          user: session?.user ?? null
        });
      }
    );

    return {
      subscription,
      error: null
    };
  } catch (error) {
    return {
      subscription: null,
      error
    };
  }
}
