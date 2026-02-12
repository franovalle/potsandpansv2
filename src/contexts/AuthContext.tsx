import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type AppRole = "hha" | "business" | "admin";

const SUPABASE_URL = "https://dqvjkwrrxbtyziliyrkh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxdmprd3JyeGJ0eXppbGl5cmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDgxNTIsImV4cCI6MjA4NjQyNDE1Mn0.D8s6cg-qS4jOI1LI71mQbzqf8zLwQGmBu8ssaEjFAYQ";

interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string, accessToken?: string) => {
    try {
      const result = await Promise.race([
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);
      if (result.data) {
        setRole((result.data.role as AppRole) || null);
        return;
      }
    } catch {
      // Fallback: direct REST call
    }

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_roles?select=role&user_id=eq.${userId}&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setRole((data?.[0]?.role as AppRole) || null);
        return;
      }
    } catch {
      // both failed
    }
    setRole(null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchRole(currentUser.id, session?.access_token);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchRole(currentUser.id, session?.access_token);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);
    } catch {
      // Fallback: direct REST logout
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (session?.access_token) {
          await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${session.access_token}`,
            },
          });
        }
      } catch {
        // ignore
      }
    }
    // Always clear state and storage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-")) localStorage.removeItem(key);
    });
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
