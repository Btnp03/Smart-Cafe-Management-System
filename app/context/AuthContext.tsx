"use client";

import {
  createContext,
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

  async function getUserProfile() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (!session) {
      setUser(null);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
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

    setUser((profile as UserProfile | null) ?? null);
    setLoading(false);
  }

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
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}
