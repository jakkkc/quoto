import { supabase } from './supabase'

// TEMPORARY: signs in as a single hardcoded dev user so auth.uid()
// is populated for RLS. Replace with a real login flow later —
// nothing else in the app needs to change, since it already goes through
// supabase.auth session state.
export async function ensureDevSession() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session

  const { data, error } = await supabase.auth.signInWithPassword({
    email: import.meta.env.VITE_DEV_EMAIL,
    password: import.meta.env.VITE_DEV_PASSWORD,
  })
  if (error) throw error
  return data.session
}
