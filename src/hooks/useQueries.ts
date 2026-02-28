import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Booking, AvailabilitySlot, Pricing, Profile } from "../types";

// ── Bookings list (teacher sees all, student sees own) ──

export function useBookingsList(role: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["bookings", { role, userId }],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select("*, profiles!bookings_student_id_fkey(full_name, timezone)")
        .order("start_time", { ascending: false });

      if (role !== "teacher") {
        query = query.eq("student_id", userId!);
      }

      const { data } = await query;
      return (data || []) as Booking[];
    },
    enabled: !!userId,
  });
}

export function useBookingAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ booking, action }: { booking: Booking; action: "confirm" | "reject" }) => {
      const endpoint = action === "confirm" ? "confirm-booking" : "reject-booking";
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}?token=${booking.confirmation_token}`
      );
      if (!res.ok) throw new Error("Request failed");
      return { bookingId: booking.id, action };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId }: { bookingId: string }) => {
      const { error } = await supabase.functions.invoke("cancel-booking", {
        body: { booking_id: bookingId },
      });
      if (error) throw new Error(error.message || "Request failed");
      return { bookingId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ── Student calendar data ──

export function useAvailableSlots() {
  return useQuery({
    queryKey: ["availability-slots", "available"],
    queryFn: async () => {
      const now = new Date().toISOString();

      // Get future slots
      const { data: slotsData } = await supabase
        .from("availability_slots")
        .select("*")
        .gte("start_time", now)
        .order("start_time", { ascending: true });

      const slots = (slotsData || []) as AvailabilitySlot[];
      if (slots.length === 0) return [];

      // Get slot IDs that have an active booking
      const slotIds = slots.map((s) => s.id);
      const { data: bookedData } = await supabase
        .from("bookings")
        .select("availability_slot_id")
        .in("availability_slot_id", slotIds)
        .in("status", ["pending_confirmation", "confirmed"]);

      const bookedSlotIds = new Set((bookedData || []).map((b) => b.availability_slot_id));

      return slots.filter((s) => !bookedSlotIds.has(s.id));
    },
  });
}

export function usePricing() {
  return useQuery({
    queryKey: ["pricing"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pricing")
        .select("*")
        .order("effective_from", { ascending: false })
        .limit(1)
        .single();
      return data as Pricing | null;
    },
  });
}

export function useMyBookings(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-bookings", userId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("student_id", userId!)
        .in("status", ["pending_confirmation", "confirmed"])
        .gte("end_time", now);
      return (data || []) as Booking[];
    },
    enabled: !!userId,
  });
}

// ── Teacher dashboard ──

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: upcoming }, { data: pending }, { data: students }] = await Promise.all([
        supabase
          .from("bookings")
          .select("*, profiles!bookings_student_id_fkey(full_name, timezone)")
          .eq("status", "confirmed")
          .gte("start_time", now)
          .lte("start_time", weekFromNow)
          .order("start_time", { ascending: true }),
        supabase
          .from("bookings")
          .select("*, profiles!bookings_student_id_fkey(full_name, timezone)")
          .eq("status", "pending_confirmation")
          .order("created_at", { ascending: false }),
        supabase
          .from("bookings")
          .select("student_id")
          .in("status", ["confirmed", "pending_confirmation"]),
      ]);

      const uniqueStudents = new Set(students?.map((b) => b.student_id) || []);

      return {
        upcomingBookings: (upcoming || []) as Booking[],
        pendingBookings: (pending || []) as Booking[],
        studentCount: uniqueStudents.size,
      };
    },
  });
}

// ── Teacher availability manager ──

export function useTeacherAvailability(teacherId: string | undefined) {
  return useQuery({
    queryKey: ["availability-slots", "teacher", teacherId],
    queryFn: async () => {
      const { data: slotsData } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("teacher_id", teacherId!)
        .order("start_time", { ascending: true });

      const slots = (slotsData || []) as AvailabilitySlot[];

      let bookings: Booking[] = [];
      if (slots.length > 0) {
        const slotIds = slots.map((s) => s.id);
        const { data: bookingsData } = await supabase
          .from("bookings")
          .select("*, profiles!bookings_student_id_fkey(full_name, timezone)")
          .in("availability_slot_id", slotIds)
          .in("status", ["pending_confirmation", "confirmed"]);
        bookings = (bookingsData || []) as Booking[];
      }

      return { slots, bookings };
    },
    enabled: !!teacherId,
  });
}

// ── Student list ──

interface StudentSummary {
  id: string;
  full_name: string;
  email: string;
  custom_hourly_rate_cents: number | null;
  bookings: Booking[];
  totalConfirmed: number;
  totalMinutes: number;
}

// ── Admin dashboard ──

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [{ data: profiles }, { data: bookings }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase
          .from("bookings")
          .select("*, profiles!bookings_student_id_fkey(full_name, email)")
          .order("created_at", { ascending: false }),
      ]);

      const allProfiles = (profiles || []) as Profile[];
      const allBookings = (bookings || []) as Booking[];

      const studentCount = allProfiles.filter((p) => p.role === "student").length;
      const confirmedBookings = allBookings.filter((b) => b.status === "confirmed");
      const pendingBookings = allBookings.filter((b) => b.status === "pending_confirmation");
      const revenueCents = confirmedBookings.reduce((sum, b) => sum + b.price_cents, 0);

      return {
        profiles: allProfiles,
        bookings: allBookings,
        recentBookings: allBookings.slice(0, 10),
        studentCount,
        confirmedCount: confirmedBookings.length,
        pendingCount: pendingBookings.length,
        revenueCents,
      };
    },
  });
}

export function useStudentList() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*, profiles!bookings_student_id_fkey(id, full_name, email, timezone, custom_hourly_rate_cents)")
        .in("status", ["confirmed", "pending_confirmation"])
        .order("start_time", { ascending: false });

      if (!bookingsData) return [];

      const studentMap = new Map<string, StudentSummary>();
      for (const booking of bookingsData as unknown as Booking[]) {
        const sid = booking.student_id;
        if (!studentMap.has(sid)) {
          studentMap.set(sid, {
            id: sid,
            full_name: booking.profiles?.full_name || "",
            email: booking.profiles?.email || "",
            custom_hourly_rate_cents: (booking.profiles as { custom_hourly_rate_cents?: number | null })?.custom_hourly_rate_cents ?? null,
            bookings: [],
            totalConfirmed: 0,
            totalMinutes: 0,
          });
        }
        const s = studentMap.get(sid)!;
        s.bookings.push(booking);
        if (booking.status === "confirmed") {
          s.totalConfirmed++;
          // Derive duration from start/end times (always 60 min for new bookings)
          const durationMin = Math.round(
            (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / 60000
          );
          s.totalMinutes += durationMin;
        }
      }

      return Array.from(studentMap.values());
    },
  });
}

export function useUpdateStudentRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, rateCents }: { studentId: string; rateCents: number | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ custom_hourly_rate_cents: rateCents })
        .eq("id", studentId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
}
