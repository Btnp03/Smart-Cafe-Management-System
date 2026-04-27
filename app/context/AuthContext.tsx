"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../../lib/supabase";

type Branch = {
  id: number;
  branch_name: string;
};

type UserProfile = {
  id: string;
  email: string;
  role: string;
  name: string;
  phone: string;
  branch_id: string | null;
  branch?: Branch | null;
};

type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const clearInvalidSession = useCallback(async () => {
    setUser(null);
    await supabase.auth.signOut({ scope: "local" });
  }, []);

  const getUserProfile = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          `
            *,
            branch:branch_id (
              id,
              branch_name
            )
          `
        )
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      setUser((profile as UserProfile | null) ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("Invalid Refresh Token")) {
        await clearInvalidSession();
      } else {
        console.error("Failed to load auth session", error);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [clearInvalidSession]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void getUserProfile();
    }, 0);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void getUserProfile();
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [getUserProfile]);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}
