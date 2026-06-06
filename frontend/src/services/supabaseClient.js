/**
 * Supabase client initialization.
 *
 * The client is created once and exported as a singleton.
 * Import this file wherever you need to interact with Supabase directly
 * (auth state, realtime, etc.). For REST API calls prefer the Axios instance
 * in services/api.js which auto-attaches the JWT.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist session in localStorage (default)
    persistSession: true,
    // Auto-refresh the JWT before it expires
    autoRefreshToken: true,
    // Detect session from URL hash on OAuth/magic-link redirects
    detectSessionInUrl: true,
  },
})
