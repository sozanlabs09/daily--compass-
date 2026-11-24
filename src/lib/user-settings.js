
import { supabase, isSupabaseConfigured } from './supabase.js';

const DEFAULT_SETTINGS = {
  theme: 'light',
  language: 'en',
  weekStartsOn: 6,
  timeFormat: '12h'
};

const ALLOWED_SETTINGS = {
  theme: ['light', 'dark', 'system'],
  language: ['en', 'ar'],
  weekStartsOn: [0, 1, 6],
  timeFormat: ['12h', '24h']
};

function getClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

function validateSettings(settings) {
  if (
    !settings ||
    typeof settings !== 'object' ||
    Array.isArray(settings)
  ) {
    throw new Error('Invalid settings.');
  }

  const safeSettings = {};

  for (const [key, value] of Object.entries(settings)) {
    if (
      !Object.hasOwn(ALLOWED_SETTINGS, key) ||
      !ALLOWED_SETTINGS[key].includes(value)
    ) {
      throw new Error(`Invalid setting: ${key}`);
    }

    safeSettings[key] = value;
  }

  return safeSettings;
}

export async function getMySettings() {
  try {
    const client = getClient();

    const { data: authData, error: authError } =
      await client.auth.getUser();

    if (authError) throw authError;

    if (!authData.user) {
      throw new Error('You must be logged in.');
    }

    const { data, error } = await client
      .from('user_settings')
      .select('theme, language, week_starts_on, time_format')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (error) throw error;

    return {
      settings: data
        ? {
            theme: data.theme,
            language: data.language,
            weekStartsOn: data.week_starts_on,
            timeFormat: data.time_format
          }
        : DEFAULT_SETTINGS,
      error: null
    };
  } catch (error) {
    return {
      settings: DEFAULT_SETTINGS,
      error
    };
  }
}

export async function updateMySettings(settings) {
  try {
    const client = getClient();

    const { data: authData, error: authError } =
      await client.auth.getUser();

    if (authError) throw authError;

    if (!authData.user) {
      throw new Error('You must be logged in.');
    }

    const safeSettings = validateSettings(settings);

    if (Object.keys(safeSettings).length === 0) {
      throw new Error('No settings were provided.');
    }

    const databaseSettings = {
      user_id: authData.user.id,
      updated_at: new Date().toISOString()
    };

    if ('theme' in safeSettings) {
      databaseSettings.theme = safeSettings.theme;
    }

    if ('language' in safeSettings) {
      databaseSettings.language = safeSettings.language;
    }

    if ('weekStartsOn' in safeSettings) {
      databaseSettings.week_starts_on =
        safeSettings.weekStartsOn;
    }

    if ('timeFormat' in safeSettings) {
      databaseSettings.time_format =
        safeSettings.timeFormat;
    }

    const { data, error } = await client
      .from('user_settings')
      .upsert(databaseSettings, {
        onConflict: 'user_id'
      })
      .select('theme, language, week_starts_on, time_format')
      .single();

    if (error) throw error;

    return {
      settings: {
        theme: data.theme,
        language: data.language,
        weekStartsOn: data.week_starts_on,
        timeFormat: data.time_format
      },
      error: null
    };
  } catch (error) {
    return {
      settings: null,
      error
    };
  }
}
