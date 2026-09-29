import { supabaseAdmin } from "./supabase.ts";

const RETRY_DELAYS_MS = [250, 1000, 3000];

type QueryResult<T> = { data: T | null; error: { message: string } | null };

// PostgREST intermittently answers 504 on this project without the statement ever
// reaching Postgres, so a write is only known to have landed once it answers
// without an error. Callers must never assume success.
export async function runWithRetry<T>(
  label: string,
  query: () => PromiseLike<QueryResult<T>>,
): Promise<T | null> {
  let lastMessage = "";

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1]),
      );
    }

    const { data, error } = await query();
    if (!error) return data;

    lastMessage = error.message;
    console.error(
      `[${label}] attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}: ${error.message}`,
    );
  }

  throw new Error(`${label}: ${lastMessage}`);
}

export function readBooking(bookingId: string) {
  return runWithRetry(`read booking ${bookingId}`, () =>
    supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle(),
  );
}

export function findBookingByToken(token: string) {
  return runWithRetry("read booking by token", () =>
    supabaseAdmin
      .from("bookings")
      .select("*, profiles!bookings_student_id_fkey(first_name, last_name)")
      .eq("confirmation_token", token)
      .eq("status", "pending_confirmation")
      .maybeSingle(),
  );
}

// Applies `patch` only while the booking still sits in `fromStatus`, and reports
// the status the row actually ends up in. A retry that follows a lost response
// matches no row, so the row is re-read rather than reported as a conflict.
export async function transitionBooking(
  bookingId: string,
  fromStatus: string | string[],
  patch: Record<string, unknown>,
): Promise<string | null> {
  const from = Array.isArray(fromStatus) ? fromStatus : [fromStatus];

  const updated = await runWithRetry<{ status: string }>(
    `transition booking ${bookingId} -> ${patch.status}`,
    () =>
      supabaseAdmin
        .from("bookings")
        .update(patch)
        .eq("id", bookingId)
        .in("status", from)
        .select("status")
        .maybeSingle(),
  );

  if (updated) return updated.status;

  const current = await runWithRetry<{ status: string }>(
    `re-read booking ${bookingId}`,
    () =>
      supabaseAdmin
        .from("bookings")
        .select("status")
        .eq("id", bookingId)
        .maybeSingle(),
  );

  return current?.status ?? null;
}

export function patchBooking(
  bookingId: string,
  patch: Record<string, unknown>,
) {
  return runWithRetry(`patch booking ${bookingId}`, () =>
    supabaseAdmin
      .from("bookings")
      .update(patch)
      .eq("id", bookingId)
      .select("id")
      .maybeSingle(),
  );
}
