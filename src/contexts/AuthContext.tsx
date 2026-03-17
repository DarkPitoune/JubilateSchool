import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Profile, AuthContextValue } from "../types";

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [realProfile, setRealProfile] = useState<Profile | null>(null);
  const [impersonating, setImpersonating] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const profile = impersonating ?? realProfile;

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile;
  };

  // Phase 1: Listen for auth state changes — sync only, no Supabase API calls
  // (the callback fires inside a held lock, so calling supabase.from() here deadlocks)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session?.user) {
        setRealProfile(null);
        setImpersonating(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Phase 2: Fetch profile once we have a user id (runs outside the auth lock)
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    let cancelled = false;

    (async () => {
      const p = await fetchProfile(userId);
      if (cancelled) return;

      if (p && p.role !== "admin") {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (browserTz && browserTz !== p.timezone) {
          supabase
            .from("profiles")
            .update({ timezone: browserTz })
            .eq("id", p.id)
            .then(() => {});
          p.timezone = browserTz;
        }
      }
      setRealProfile(p);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRealProfile(null);
    setImpersonating(null);
  };

  const impersonate = (p: Profile | null) => {
    setImpersonating(p);
  };

  return (
    <AuthContext.Provider value={{ session, profile, realProfile, loading, signOut, impersonate }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
