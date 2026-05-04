import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type {
  Booking,
  AvailabilitySlot,
  CharityDonation,
  ExtraordinaryExpense,
  Pricing,
  Profile,
} from "../types";

// ── Bookings list (teacher sees all, student sees own) ──

export function useBookingsList(
  role: string | undefined,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: ["bookings", { role, userId }],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select(
          "*, profiles!bookings_student_id_fkey(first_name, last_name, timezone)",
        )
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
    mutationFn: async ({
      booking,
      action,
    }: {
      booking: Booking;
      action: "confirm" | "reject";
    }) => {
      const endpoint =
        action === "confirm" ? "confirm-booking" : "reject-booking";
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}?token=${booking.confirmation_token}`,
      );
      if (!res.ok) throw new Error("Request failed");
      return { bookingId: booking.id, action };
    },
    onSuccess: (_data, { booking, action }) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (action === "confirm") {
        window.umami?.track("booking-confirmed", {
          revenue: booking.price_cents / 100,
          currency: "EUR",
        });
      }
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
    }: {
      bookingId: string;
      priceCents: number;
      wasConfirmed: boolean;
    }) => {
      const { error } = await supabase.functions.invoke("cancel-booking", {
        body: { booking_id: bookingId },
      });
      if (error) throw new Error(error.message || "Request failed");
      return { bookingId };
    },
    onSuccess: (_data, { wasConfirmed, priceCents }) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (wasConfirmed) {
        window.umami?.track("booking-cancelled", {
          revenue: -(priceCents / 100),
          currency: "EUR",
        });
      }
    },
  });
}

// ── Student calendar data ──

export function useAvailableSlots() {
  return useQuery({
    queryKey: ["availability-slots", "available"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_student_slots");
      return (data || []) as AvailabilitySlot[];
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

export function useUpdatePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ hourlyRateCents }: { hourlyRateCents: number }) => {
      const { error } = await supabase
        .from("pricing")
        .insert({
          hourly_rate_cents: hourlyRateCents,
          effective_from: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pricing"] }),
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
      const weekFromNow = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const [{ data: upcoming }, { data: pending }, { data: students }] =
        await Promise.all([
          supabase
            .from("bookings")
            .select(
              "*, profiles!bookings_student_id_fkey(first_name, last_name, timezone)",
            )
            .eq("status", "confirmed")
            .gte("start_time", now)
            .lte("start_time", weekFromNow)
            .order("start_time", { ascending: true }),
          supabase
            .from("bookings")
            .select(
              "*, profiles!bookings_student_id_fkey(first_name, last_name, timezone)",
            )
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
          .select(
            "*, profiles!bookings_student_id_fkey(first_name, last_name, timezone)",
          )
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
  first_name: string;
  last_name: string;
  email: string;
  custom_hourly_rate_cents: number | null;
  bookings: Booking[];
  totalConfirmed: number;
  totalMinutes: number;
}

export function useStudentsForPicker() {
  return useQuery({
    queryKey: ["students-picker"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("role", "student")
        .order("last_name");
      return (data || []) as Pick<
        Profile,
        "id" | "first_name" | "last_name" | "email"
      >[];
    },
  });
}

// ── Admin dashboard ──

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [{ data: profiles }, { data: bookings }] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("bookings")
          .select(
            "*, profiles!bookings_student_id_fkey(first_name, last_name, email)",
          )
          .order("created_at", { ascending: false }),
      ]);

      const allProfiles = (profiles || []) as Profile[];
      const allBookings = (bookings || []) as Booking[];

      const studentCount = allProfiles.filter(
        (p) => p.role === "student",
      ).length;
      const confirmedBookings = allBookings.filter(
        (b) => b.status === "confirmed",
      );
      const pendingBookings = allBookings.filter(
        (b) => b.status === "pending_confirmation",
      );
      const revenueCents = confirmedBookings.reduce(
        (sum, b) => sum + b.price_cents,
        0,
      );

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
      // Fetch all student profiles (no filtering by bookings)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, custom_hourly_rate_cents")
        .eq("role", "student")
        .order("last_name");

      if (!profiles) return [];

      // Fetch active bookings for enrichment
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*")
        .in("status", ["confirmed", "pending_confirmation"])
        .order("start_time", { ascending: false });

      const bookingsByStudent = new Map<string, Booking[]>();
      for (const booking of (bookingsData ?? []) as unknown as Booking[]) {
        const arr = bookingsByStudent.get(booking.student_id) ?? [];
        arr.push(booking);
        bookingsByStudent.set(booking.student_id, arr);
      }

      return profiles.map((p) => {
        const bookings = bookingsByStudent.get(p.id) ?? [];
        let totalConfirmed = 0;
        let totalMinutes = 0;
        for (const b of bookings) {
          if (b.status === "confirmed") {
            totalConfirmed++;
            totalMinutes += Math.round(
              (new Date(b.end_time).getTime() -
                new Date(b.start_time).getTime()) /
                60000,
            );
          }
        }
        return {
          id: p.id,
          first_name: p.first_name || "",
          last_name: p.last_name || "",
          email: p.email || "",
          custom_hourly_rate_cents: p.custom_hourly_rate_cents ?? null,
          bookings,
          totalConfirmed,
          totalMinutes,
        } as StudentSummary;
      });
    },
  });
}

export function useUpdateStudentRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      rateCents,
    }: {
      studentId: string;
      rateCents: number | null;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ custom_hourly_rate_cents: rateCents })
        .eq("id", studentId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
}

// ── Accounting ──

export interface AccountingMonth {
  key: string; // YYYY-MM, or "lifetime"
  label: string; // French label ("Mars 2026") or "Depuis le ..."
  gross_cents: number;
  stripe_fees_cents: number;
  maintenance_cents: number; // 10% of gross
  extraordinary_cents: number; // sum of expenses in the period
  net_cents: number; // gross - maintenance - extraordinary (Stripe fees are absorbed by the 10% maintenance)
  bookings: Booking[];
  expenses: ExtraordinaryExpense[];
}

const PARIS_TZ = "Europe/Paris";
const FR_MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function monthKeyParis(iso: string): string {
  // yyyy-MM in Europe/Paris
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}-${m}`;
}

function monthLabelFr(key: string): string {
  const [y, m] = key.split("-");
  return `${FR_MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

export function useAccountingData() {
  return useQuery({
    queryKey: ["accounting"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [
        { data: bookingsData },
        { data: expensesData },
        { data: donationsData },
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            "*, profiles!bookings_student_id_fkey(first_name, last_name, email)",
          )
          .eq("status", "confirmed")
          .not("stripe_payment_intent_id", "is", null)
          .order("start_time", { ascending: false }),
        supabase
          .from("extraordinary_expenses")
          .select("*")
          .order("incurred_on", { ascending: false }),
        supabase
          .from("charity_donations")
          .select("*")
          .order("donated_on", { ascending: false }),
      ]);

      const bookings = (bookingsData ?? []) as Booking[];
      const expenses = (expensesData ?? []) as ExtraordinaryExpense[];
      const donations = (donationsData ?? []) as CharityDonation[];

      // Read cached fees from the column; backfill any missing rows via the edge function.
      const fees: Record<string, number> = {};
      for (const b of bookings) {
        if (b.stripe_payment_intent_id && b.stripe_fee_cents != null) {
          fees[b.stripe_payment_intent_id] = b.stripe_fee_cents;
        }
      }
      const missing = bookings
        .filter((b) => b.stripe_payment_intent_id && b.stripe_fee_cents == null)
        .map((b) => b.stripe_payment_intent_id as string);
      if (missing.length > 0) {
        const { data: fnData, error: fnError } =
          await supabase.functions.invoke("fetch-stripe-fees", {
            body: { payment_intent_ids: missing },
          });
        if (fnError) {
          console.error("fetch-stripe-fees failed", fnError);
        } else {
          const fetched =
            (fnData as { fees?: Record<string, number> })?.fees ?? {};
          Object.assign(fees, fetched);
        }
      }

      const bookingsByMonth = new Map<string, Booking[]>();
      for (const b of bookings) {
        const key = monthKeyParis(b.start_time);
        const arr = bookingsByMonth.get(key) ?? [];
        arr.push(b);
        bookingsByMonth.set(key, arr);
      }

      const expensesByMonth = new Map<string, ExtraordinaryExpense[]>();
      for (const e of expenses) {
        const key = e.incurred_on.slice(0, 7); // YYYY-MM
        const arr = expensesByMonth.get(key) ?? [];
        arr.push(e);
        expensesByMonth.set(key, arr);
      }

      const allKeys = new Set<string>([
        ...bookingsByMonth.keys(),
        ...expensesByMonth.keys(),
      ]);

      const months: AccountingMonth[] = [...allKeys]
        .sort((a, b) => (a < b ? 1 : -1))
        .map((key) => {
          const bs = bookingsByMonth.get(key) ?? [];
          const exs = expensesByMonth.get(key) ?? [];
          const gross = bs.reduce((s, b) => s + b.price_cents, 0);
          const stripeFees = bs.reduce(
            (s, b) => s + (fees[b.stripe_payment_intent_id ?? ""] ?? 0),
            0,
          );
          const maintenance = Math.round(gross * 0.1);
          const extraordinary = exs.reduce((s, e) => s + e.amount_cents, 0);
          return {
            key,
            label: monthLabelFr(key),
            gross_cents: gross,
            stripe_fees_cents: stripeFees,
            maintenance_cents: maintenance,
            extraordinary_cents: extraordinary,
            net_cents: gross - maintenance - extraordinary,
            bookings: bs,
            expenses: exs,
          };
        });

      const gross = months.reduce((s, m) => s + m.gross_cents, 0);
      const stripeFees = months.reduce((s, m) => s + m.stripe_fees_cents, 0);
      const maintenance = months.reduce((s, m) => s + m.maintenance_cents, 0);
      const extraordinary = months.reduce(
        (s, m) => s + m.extraordinary_cents,
        0,
      );
      const netLifetime = gross - maintenance - extraordinary;
      const donatedLifetime = donations.reduce(
        (s, d) => s + d.amount_cents,
        0,
      );
      const lifetime: AccountingMonth = {
        key: "lifetime",
        label: "Total (depuis le lancement)",
        gross_cents: gross,
        stripe_fees_cents: stripeFees,
        maintenance_cents: maintenance,
        extraordinary_cents: extraordinary,
        net_cents: netLifetime,
        bookings,
        expenses,
      };

      return {
        months,
        lifetime,
        donations,
        donated_cents: donatedLifetime,
        to_give_cents: netLifetime - donatedLifetime,
      };
    },
  });
}

export function useAddExtraordinaryExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      label: string;
      amount_cents: number;
      incurred_on: string;
      notes?: string | null;
    }) => {
      const { error } = await supabase
        .from("extraordinary_expenses")
        .insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounting"] }),
  });
}

export function useDeleteExtraordinaryExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("extraordinary_expenses")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounting"] }),
  });
}

export function useAddCharityDonation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      amount_cents: number;
      donated_on: string;
      label?: string | null;
    }) => {
      const { error } = await supabase.from("charity_donations").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounting"] }),
  });
}

export function useDeleteCharityDonation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("charity_donations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounting"] }),
  });
}
