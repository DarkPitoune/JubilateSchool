import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

/**
 * Returns the counterpart's timezone:
 * - For students: the teacher's timezone
 * - For teacher: "Europe/Paris" (most students are French)
 */
export function useCounterpartTz(): string | null {
  const { profile } = useAuth();
  const [tz, setTz] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (profile.role === "teacher") {
      setTz("Europe/Paris");
    } else {
      supabase
        .from("profiles")
        .select("timezone")
        .eq("role", "teacher")
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data?.timezone) setTz(data.timezone);
        });
    }
  }, [profile]);

  return tz;
}
