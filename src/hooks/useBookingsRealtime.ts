import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export function useBookingsRealtime() {
  const queryClient = useQueryClient();
  const { realProfile } = useAuth();

  useEffect(() => {
    if (!realProfile) return;

    const isStudent = realProfile.role === "student";
    const filter = isStudent ? `student_id=eq.${realProfile.id}` : undefined;

    const channel = supabase
      .channel("bookings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", ...(filter ? { filter } : {}) },
        () => {
          queryClient.invalidateQueries({ queryKey: ["bookings"] });
          queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          queryClient.invalidateQueries({ queryKey: ["availability-slots"] });
          queryClient.invalidateQueries({ queryKey: ["students"] });
          queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
        }
      )
      .subscribe((_status, err) => {
        if (err) console.warn("[realtime] bookings subscription error:", err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [realProfile?.id, realProfile?.role, queryClient]);
}
