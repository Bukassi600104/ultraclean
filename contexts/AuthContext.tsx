"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/auth";

interface Profile {
  id: string;
  role: UserRole;
  suspended?: boolean;
  name: string | null;
  email: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const activeUser=useRef<string|null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let version=0,disposed=false;
    async function loadUser() {
      const requestVersion=++version;
      const supabase = createClient()!;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if(disposed||requestVersion!==version)return;
      if (user) {
        activeUser.current=user.id;
        setUser(user);
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (!disposed&&requestVersion===version)setProfile(data as Profile|null);
      }
      if(!disposed&&requestVersion===version)setIsLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if(session?.user.id===activeUser.current&&_event!=="USER_UPDATED")return;
      activeUser.current=session?.user.id??null;
      version++;
      setUser(session?.user ?? null);
      setProfile(null);
      if(session?.user)setTimeout(()=>{if(!disposed)void loadUser();},0);
    });

    return () => {disposed=true;version++;subscription.unsubscribe();};
  }, []);

  async function signOut() {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
