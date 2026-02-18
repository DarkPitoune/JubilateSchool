import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { supabaseAdmin } from "../_shared/supabase.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

// This function should be invoked via a cron job (e.g., Supabase scheduled function)
// every 15 minutes to expire stale pending bookings.

serve(async (_req) => {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Find bookings pending for more than 48 hours
    const { data: staleBookings } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("status", "pending_confirmation")
      .lt("created_at", cutoff);

    if (!staleBookings || staleBookings.length === 0) {
      return new Response(
        JSON.stringify({ expired: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let expired = 0;

    for (const booking of staleBookings) {
      // Cancel the Stripe PaymentIntent (release hold)
      if (booking.stripe_payment_intent_id) {
        try {
          await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id);
        } catch (err) {
          console.error(
            `Failed to cancel PaymentIntent ${booking.stripe_payment_intent_id}:`,
            err.message
          );
        }
      }

      // Update status to expired
      await supabaseAdmin
        .from("bookings")
        .update({ status: "expired" })
        .eq("id", booking.id);

      // Notify student
      await supabaseAdmin.functions.invoke("send-email", {
        body: {
          type: "booking_expired_student",
          booking_id: booking.id,
        },
      });

      expired++;
    }

    return new Response(
      JSON.stringify({ expired }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
