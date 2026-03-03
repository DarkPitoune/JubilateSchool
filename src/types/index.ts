import type { Session } from "@supabase/supabase-js";

// Database row types

export interface Profile {
  id: string;
  role: "student" | "teacher" | "admin";
  full_name: string;
  email: string;
  preferred_lang: "fr" | "en";
  timezone: string;
  created_at: string;
  custom_hourly_rate_cents: number | null;
  personal_access_token: string;
}

export interface AvailabilityRange {
  id: string;
  teacher_id: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface AvailabilitySlot {
  id: string;
  teacher_id: string;
  start_time: string; // end_time = start_time + 1h (always)
  created_at: string;
  is_booked?: boolean; // only present from get_student_slots RPC
}

export type BookingStatus =
  | "pending_confirmation"
  | "confirmed"
  | "rejected"
  | "expired"
  | "payment_failed"
  | "cancelled_by_student"
  | "cancelled_by_teacher";

export interface Booking {
  id: string;
  availability_range_id: string | null;
  availability_slot_id: string | null;
  student_id: string;
  start_time: string;
  end_time: string;
  note: string;
  price_cents: number;
  status: BookingStatus;
  stripe_payment_intent_id: string | null;
  confirmation_token: string;
  zoom_meeting_link: string | null;
  created_at: string;
  profiles?: { full_name: string; email?: string; id?: string; timezone?: string };
}

export interface Pricing {
  id: string;
  hourly_rate_cents: number;
  currency: string;
  effective_from: string;
}

// Auth context

export interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  realProfile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  impersonate: (profile: Profile | null) => void;
}

// Translator

export type TranslatorFn = (keyword: string) => string;
