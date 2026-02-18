import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(renderHTML("Error", "Missing confirmation token."), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Find the booking by confirmation token
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("confirmation_token", token)
      .eq("status", "pending_confirmation")
      .single();

    if (!booking) {
      return new Response(
        renderHTML(
          "Not found",
          "Booking not found or already processed."
        ),
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    // Capture the Stripe payment
    if (booking.stripe_payment_intent_id) {
      await stripe.paymentIntents.capture(booking.stripe_payment_intent_id);
    }

    // Update booking status
    await supabaseAdmin
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", booking.id);

    // Send confirmation emails
    await supabaseAdmin.functions.invoke("send-email", {
      body: {
        type: "booking_confirmed_student",
        booking_id: booking.id,
      },
    });

    await supabaseAdmin.functions.invoke("send-email", {
      body: {
        type: "booking_confirmed_teacher",
        booking_id: booking.id,
      },
    });

    return new Response(
      renderHTML(
        "Booking Confirmed ✓",
        "The payment has been captured and both parties have been notified."
      ),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      renderHTML("Error", `Something went wrong: ${err.message}`),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
});

function renderHTML(title: string, message: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Jubilate School</title>
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5;}
.card{background:white;padding:3rem;border-radius:1rem;text-align:center;max-width:400px;box-shadow:0 2px 8px rgba(0,0,0,.1);}
h1{color:#030340;margin-bottom:1rem;}p{color:#666;}</style>
</head><body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`;
}
