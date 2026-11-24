
import { supabase, isSupabaseConfigured } from './supabase.js';

function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Authentication is not configured. Please configure Supabase first.'
    );
  }

  return supabase;
}

function validateCredentials(email, password) {
  if (typeof email !== 'string' || !email.trim()) {
    throw new Error('Please enter your email address.');
  }

  const normalizedEmail = email.trim();

  if (
    normalizedEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    throw new Error('Please enter a valid email address.');
  }

  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Please enter your password.');
  }

  return normalizedEmail;
}

export async function signUp(email, password) {
  try {
    const normalizedEmail = validateCredentials(email, password);
    const client = getSupabaseClient();

    const { data, error } = await client.auth.signUp({
      email: normalizedEmail,
      password
    });

    if (error) throw error;

    return {
      user: data?.user ?? null,
      session: data?.session ?? null,
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
    const normalizedEmail = validateCredentials(email, password);
    const client = getSupabaseClient();

    const { data, error } = await client.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    if (error) throw error;

    return {
      user: data?.user ?? null,
      session: data?.session ?? null,
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
      user: data?.user ?? null,
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
    if (typeof callback !== 'function') {
      throw new Error('Authentication callback must be a function.');
    }

    const client = getSupabaseClient();

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((event, session) => {
      try {
        callback({
          event,
          session,
          user: session?.user ?? null
        });
      } catch (error) {
        console.error('Authentication callback failed:', error);
      }
    });

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
