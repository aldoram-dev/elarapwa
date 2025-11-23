import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Dev-time guards to help catch misconfiguration early (no secrets logged)
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.error('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check your .env(.development) files.')
}

// Basic format check to avoid common typos that cause DNS NXDOMAIN
try {
  const u = new URL(SUPABASE_URL || 'http://invalid')
  const hostOk = /\.supabase\.co$/.test(u.hostname)
  if (!hostOk) {
    // eslint-disable-next-line no-console
    console.warn(`[Supabase] VITE_SUPABASE_URL host "${u.hostname}" doesn't look like a supabase.co domain`) 
  }
} catch (_) {
  // eslint-disable-next-line no-console
  console.warn('[Supabase] VITE_SUPABASE_URL is not a valid URL string')
}

export const supabase = createClient(
  (SUPABASE_URL as string),
  (SUPABASE_ANON_KEY as string)
)

export function getSupabaseHost(): string | null {
  try {
    if (!SUPABASE_URL) return null
    return new URL(SUPABASE_URL).hostname
  } catch {
    return null
  }
}

export function isSupabaseUrlLikelyValid(): boolean {
  try {
    if (!SUPABASE_URL) return false
    const u = new URL(SUPABASE_URL)
    return /\.supabase\.co$/.test(u.hostname)
  } catch {
    return false
  }
}
