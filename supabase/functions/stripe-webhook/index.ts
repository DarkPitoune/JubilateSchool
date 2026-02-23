import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { supabaseAdmin } from "../_shared/supabase.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.booking_id;

      if (bookingId && session.payment_intent) {
        // Store the payment intent ID on the booking
        await supabaseAdmin
          .from("bookings")
          .update({
            stripe_payment_intent_id:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent.id,
          })
          .eq("id", bookingId);

        // Trigger teacher notification email
        await supabaseAdmin.functions.invoke("send-email", {
          body: {
            type: "new_booking_teacher",
            booking_id: bookingId,
          },
        });
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.booking_id;

      if (bookingId) {
        // Delete the pending booking to free the slot
        await supabaseAdmin
          .from("bookings")
          .delete()
          .eq("id", bookingId)
          .eq("status", "pending_confirmation");
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
