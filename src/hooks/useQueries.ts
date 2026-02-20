import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Booking, AvailabilityRange, Pricing, FreeWindow } from "../types";

// ── Bookings list (teacher sees all, student sees own) ──

export function useBookingsList(role: "teacher" | "student" | undefined, userId: string | undefined) {
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

// ── Student calendar data ──

export function useAvailabilityRangesForStudents() {
  return useQuery({
    queryKey: ["availability-ranges"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("availability_ranges")
        .select("*")
        .gte("end_time", now)
        .order("start_time", { ascending: true });
      return (data || []) as AvailabilityRange[];
    },
  });
}

export function useBookingsByRanges(rangeIds: string[]) {
  return useQuery({
    queryKey: ["bookings", "by-ranges", rangeIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .in("availability_range_id", rangeIds)
        .in("status", ["pending_confirmation", "confirmed"]);
      return (data || []) as Booking[];
    },
    enabled: rangeIds.length > 0,
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

export function computeFreeWindows(ranges: AvailabilityRange[], bookings: Booking[]): FreeWindow[] {
  const free: FreeWindow[] = [];
  for (const range of ranges) {
    const rangeStart = new Date(range.start_time).getTime();
    const rangeEnd = new Date(range.end_time).getTime();

    const rangeBookings = bookings
      .filter((b) => b.availability_range_id === range.id)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    let cursor = rangeStart;
    for (const booking of rangeBookings) {
      const bStart = new Date(booking.start_time).getTime();
      const bEnd = new Date(booking.end_time).getTime();

      if (cursor < bStart) {
        const gapStart = Math.max(cursor, Date.now());
        if (gapStart < bStart) {
          free.push({
            rangeId: range.id,
            start: new Date(gapStart).toISOString(),
            end: new Date(bStart).toISOString(),
          });
        }
      }
      cursor = Math.max(cursor, bEnd);
    }

    if (cursor < rangeEnd) {
      const gapStart = Math.max(cursor, Date.now());
      if (gapStart < rangeEnd) {
        free.push({
          rangeId: range.id,
          start: new Date(gapStart).toISOString(),
          end: new Date(rangeEnd).toISOString(),
        });
      }
    }
  }
  return free;
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
    queryKey: ["availability-ranges", "teacher", teacherId],
    queryFn: async () => {
      const { data: rangesData } = await supabase
        .from("availability_ranges")
        .select("*")
        .eq("teacher_id", teacherId!)
        .order("start_time", { ascending: true });

      const ranges = (rangesData || []) as AvailabilityRange[];

      let bookings: Booking[] = [];
      if (ranges.length > 0) {
        const rangeIds = ranges.map((r) => r.id);
        const { data: bookingsData } = await supabase
          .from("bookings")
          .select("*, profiles!bookings_student_id_fkey(full_name, timezone)")
          .in("availability_range_id", rangeIds)
          .in("status", ["pending_confirmation", "confirmed"]);
        bookings = (bookingsData || []) as Booking[];
      }

      return { ranges, bookings };
    },
    enabled: !!teacherId,
  });
}

// ── Student list ──

interface StudentSummary {
  id: string;
  full_name: string;
  email: string;
  bookings: Booking[];
  totalConfirmed: number;
  totalMinutes: number;
}

export function useStudentList() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*, profiles!bookings_student_id_fkey(id, full_name, email, timezone)")
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
            bookings: [],
            totalConfirmed: 0,
            totalMinutes: 0,
          });
        }
        const s = studentMap.get(sid)!;
        s.bookings.push(booking);
        if (booking.status === "confirmed") {
          s.totalConfirmed++;
          s.totalMinutes += booking.duration_minutes;
        }
      }

      return Array.from(studentMap.values());
    },
  });
}
