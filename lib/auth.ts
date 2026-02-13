import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export type UserRole = "admin" | "manager";

export interface Profile {
  id: string;
  role: UserRole;
  name: string | null;
  email: string | null;
  created_at: string;
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
  if (!profile || profile.role !== "admin") {
    throw new Error("Unauthorized: admin access required");
  }
  return profile;
}

export async function requireManager() {
  const profile = await getCurrentUser();
  if (!profile || (profile.role !== "manager" && profile.role !== "admin")) {
    throw new Error("Unauthorized: manager access required");
  }
  return profile;
}
