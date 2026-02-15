import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "Supabase server environment variables not set. Database features will be unavailable."
    );
    return null;
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey);
}

/** Read-only client using the anon key — safe for public pages, respects RLS */
export function createPublicServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.warn(
      "Supabase public environment variables not set. Database features will be unavailable."
    );
    return null;
  }

  return createSupabaseClient(supabaseUrl, anonKey);
}
