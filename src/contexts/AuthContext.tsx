import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Profile, AuthContextValue } from "../types";

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        if (p) {
          // Auto-detect browser timezone and sync if different
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
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // When the tab becomes visible again after being backgrounded,
    // force a token refresh so the JWT is fresh before any queries fire.
    // getSession() only returns the cached session — refreshSession() actually
    // contacts the server and issues a new access token.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        supabase.auth.refreshSession();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut }}>
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
