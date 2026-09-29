import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { captureException } from "../_shared/sentry.ts";
import { runWithRetry, transitionBooking } from "../_shared/db.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

// This function should be invoked via a cron job (e.g., Supabase scheduled function)
// every 15 minutes to expire stale pending bookings.

serve(async (_req) => {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Find bookings pending for more than 48 hours
    const staleBookings = await runWithRetry<Array<Record<string, string>>>(
      "read stale bookings",
      () =>
        supabaseAdmin
          .from("bookings")
          .select("*")
          .eq("status", "pending_confirmation")
          .lt("created_at", cutoff),
    );

    if (!staleBookings || staleBookings.length === 0) {
      return new Response(
        JSON.stringify({ expired: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let expired = 0;

    for (const booking of staleBookings) {
      try {
        // Release the hold, unless an earlier run already released it
        if (booking.stripe_payment_intent_id) {
          const intent = await stripe.paymentIntents.retrieve(
            booking.stripe_payment_intent_id,
          );

          // Money already taken: a confirmation went through without the status
          // reaching the row. Expiring would strand the payment, so leave it be.
          if (intent.status === "succeeded") {
            throw new Error(
              `Booking ${booking.id} is still pending but its payment is captured; needs manual review`,
            );
          }

          if (intent.status !== "canceled") {
            await stripe.paymentIntents.cancel(
              booking.stripe_payment_intent_id,
              { idempotencyKey: `expire-bookings:cancel:${booking.id}` },
            );
          }
        }

        const status = await transitionBooking(
          booking.id,
          "pending_confirmation",
          { status: "expired" },
        );

        if (status !== "expired") {
          console.log(`Booking ${booking.id} is now "${status}", skipping`);
          continue;
        }

        // Notify student
        const { error: emailError } = await supabaseAdmin.functions.invoke(
          "send-email",
          {
            body: {
              type: "booking_expired_student",
              booking_id: booking.id,
            },
          },
        );
        if (emailError) {
          console.error(
            `Failed to notify student for booking ${booking.id}:`,
            emailError,
          );
          captureException(emailError, { function: "expire-bookings" });
        }

        expired++;
      } catch (err) {
        console.error(`Failed to expire booking ${booking.id}:`, err.message);
        captureException(err, { function: "expire-bookings" });
      }
    }

    return new Response(
      JSON.stringify({ expired }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    captureException(err, { function: "expire-bookings" });
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
