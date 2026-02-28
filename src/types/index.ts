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
}

export interface AvailabilityRange {
  id: string;
  teacher_id: string;
  start_time: string;
  end_time: string;
  created_at: string;
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
  availability_range_id: string;
  student_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
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

export interface FreeWindow {
  rangeId: string;
  start: string;
  end: string;
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
