import { createClient } from '@supabase/supabase-js';

// Polyfill global WebSocket for Node 20 environments
if (typeof globalThis.WebSocket === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    globalThis.WebSocket = require('ws');
  } catch {
    // Fallback stub if ws is not present
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).WebSocket = class {};
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
