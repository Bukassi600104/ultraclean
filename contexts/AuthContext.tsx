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
import {loadAuthIdentity} from "@/lib/auth-identity";
import type {AuthProfile as Profile} from "@/lib/auth-identity";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  error: string | null;
  retry: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
  error: null, retry: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,setError]=useState<string|null>(null);
  const [attempt,setAttempt]=useState(0);
  const activeUser=useRef<string|null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setError("AUTH_UNAVAILABLE");setIsLoading(false);
      return;
    }

    let version=0,disposed=false;
    async function loadUser() {
      const requestVersion=++version;
      setIsLoading(true);setError(null);setProfile(null);
      const result=await loadAuthIdentity(supabase!);
      if(disposed||requestVersion!==version)return;
      activeUser.current=result.user?.id??null;
      setUser(result.user);setProfile(result.profile);setError(result.error);setIsLoading(false);
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if(session?.user.id===activeUser.current&&_event!=="USER_UPDATED")return;
      activeUser.current=session?.user.id??null;
      version++;
      setUser(session?.user ?? null);
      setProfile(null);
      if(session?.user)setTimeout(()=>{if(!disposed)void loadUser();},0);
      else {setError(null);setIsLoading(false);}
    });

    return () => {disposed=true;version++;subscription.unsubscribe();};
  }, [attempt]);

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
    <AuthContext.Provider value={{ user, profile, isLoading, signOut, error, retry:()=>setAttempt(value=>value+1) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
