import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export type UserRole = "admin" | "manager" | "property_manager" | "content_manager";

export interface Profile {
  id: string;
  role: UserRole;
  name: string | null;
  email: string | null;
  created_at: string;
  suspended?: boolean;
}

function createAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from Server Component — ignore
        }
      },
    },
  });
}

export async function getCurrentUser() {
  const supabase = createAuthClient();
  if (!supabase) return null;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;
    if (user.app_metadata?.manager_access_removed === true) return null;
    if (user.banned_until && Date.parse(user.banned_until) > Date.now()) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return profile as Profile | null;
  } catch {
    // Auth verification failed (rate limit, network error, etc.)
    return null;
  }
}

export async function requireAdmin() {
  const profile = await getCurrentUser();
  if (!profile || profile.role !== "admin" || profile.suspended === true) {
    throw new Error("Unauthorized: admin access required");
  }
  return profile;
}

export async function requireManager() {
  const profile = await getCurrentUser();
  if (!profile || (profile.role !== "manager" && profile.role !== "admin")) {
    throw new Error("Unauthorized: manager access required");
  }
  if (profile.suspended === true) {
    throw new Error("Unauthorized: account suspended");
  }
  return profile;
}

async function requireOperationsRole(role: "property_manager" | "content_manager") {
  const profile = await getCurrentUser();
  if (!profile || (profile.role !== "admin" && profile.role !== role) || profile.suspended === true) {
    throw new Error("Unauthorized: operational access required");
  }
  return profile;
}

export function requirePropertyManager() {
  return requireOperationsRole("property_manager");
}

export function requireContentManager() {
  return requireOperationsRole("content_manager");
}
