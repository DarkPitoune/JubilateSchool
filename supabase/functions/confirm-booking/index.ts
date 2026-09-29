import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { captureException } from "../_shared/sentry.ts";
import {
  findBookingByToken,
  patchBooking,
  transitionBooking,
} from "../_shared/db.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

async function createZoomMeeting(
  startTime: string,
  durationMinutes: number,
  studentName: string,
): Promise<string | null> {
  try {
    const accountId = Deno.env.get("ZOOM_ACCOUNT_ID");
    const clientId = Deno.env.get("ZOOM_CLIENT_ID");
    const clientSecret = Deno.env.get("ZOOM_CLIENT_SECRET");

    if (!accountId || !clientId || !clientSecret) {
      console.log("Zoom credentials not configured, skipping meeting creation");
      return null;
    }

    // Get access token
    const tokenRes = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    if (!tokenRes.ok) {
      console.error("Zoom token error:", await tokenRes.text());
      return null;
    }

    const { access_token } = await tokenRes.json();

    // Create meeting
    const meetingRes = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: `Jubilate School — ${studentName}`,
        type: 2,
        start_time: startTime,
        duration: durationMinutes,
        timezone: "UTC",
        settings: {
          join_before_host: true,
          waiting_room: false,
        },
      }),
    });

    if (!meetingRes.ok) {
      console.error("Zoom meeting error:", await meetingRes.text());
      return null;
    }

    const meeting = await meetingRes.json();
    return meeting.join_url;
  } catch (err) {
    console.error("Zoom meeting creation failed:", err);
    return null;
  }
}

// Captures the authorization unless Stripe already holds the money, so that
// retrying a confirmation that failed after its capture succeeds instead of
// raising payment_intent_unexpected_state.
async function capturePayment(paymentIntentId: string, bookingId: string) {
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (intent.status === "requires_capture") {
    await stripe.paymentIntents.capture(
      paymentIntentId,
      {},
      { idempotencyKey: `confirm-booking:capture:${bookingId}` },
    );
  } else if (intent.status !== "succeeded") {
    throw new Error(
      `PaymentIntent ${paymentIntentId} cannot be captured (status: ${intent.status})`,
    );
  }
}

async function readStripeFee(paymentIntentId: string): Promise<number | null> {
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge.balance_transaction"],
    });
    const charge = pi.latest_charge;
    const chargeObj =
      charge && typeof charge === "object" ? (charge as Stripe.Charge) : null;
    const bt = chargeObj?.balance_transaction;
    const btObj =
      bt && typeof bt === "object" ? (bt as Stripe.BalanceTransaction) : null;
    return btObj ? btObj.fee : null;
  } catch (err) {
    console.error("Failed to fetch Stripe fee for", paymentIntentId, err);
    return null;
  }
}

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
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    const booking = await findBookingByToken(token);

    if (!booking) {
      return new Response(
        renderHTML("Not found", "Booking not found or already processed."),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        },
      );
    }

    let feeCents: number | null = null;
    if (booking.stripe_payment_intent_id) {
      await capturePayment(booking.stripe_payment_intent_id, booking.id);
      feeCents = await readStripeFee(booking.stripe_payment_intent_id);
    }

    const update: Record<string, unknown> = { status: "confirmed" };
    if (feeCents !== null) update.stripe_fee_cents = feeCents;

    const status = await transitionBooking(
      booking.id,
      "pending_confirmation",
      update,
    );

    if (status !== "confirmed") {
      return new Response(
        renderHTML(
          "Already processed",
          `This booking is now "${status}" and cannot be confirmed.`,
        ),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        },
      );
    }

    // Best-effort, and deliberately after the confirmation: Zoom is slow and its
    // failure must never leave a captured payment on an unconfirmed booking.
    const studentName =
      `${booking.profiles?.first_name || ""} ${booking.profiles?.last_name || ""}`.trim() ||
      "Student";
    const zoomLink = await createZoomMeeting(booking.start_time, 60, studentName);
    if (zoomLink) {
      try {
        await patchBooking(booking.id, { zoom_meeting_link: zoomLink });
      } catch (err) {
        console.error("Failed to store Zoom link for booking", booking.id, err);
        captureException(err, { function: "confirm-booking", step: "zoom_link" });
      }
    }

    await notify("booking_confirmed_student", booking.id);
    await notify("booking_confirmed_teacher", booking.id);

    return new Response(
      renderHTML(
        "Booking Confirmed ✓",
        "The payment has been captured and the teacher and student have been notified.",
        booking.price_cents / 100,
      ),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } },
    );
  } catch (err) {
    console.error("Error:", err);
    captureException(err, { function: "confirm-booking" });
    return new Response(
      renderHTML("Error", `Something went wrong: ${err.message}`),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html" } },
    );
  }
});

async function notify(type: string, bookingId: string) {
  const { error } = await supabaseAdmin.functions.invoke("send-email", {
    body: { type, booking_id: bookingId },
  });
  if (error) {
    console.error(`Failed to send ${type} for booking ${bookingId}:`, error);
    captureException(error, { function: "confirm-booking", email: type });
  }
}

function renderHTML(
  title: string,
  message: string,
  revenueEur?: number,
): string {
  const umamiScript =
    revenueEur !== undefined
      ? `<script defer src="https://cloud.umami.is/script.js" data-website-id="95feb0d5-5c53-4be9-9a81-ea5328ad67b7"></script>
<script>document.addEventListener('DOMContentLoaded',()=>{if(window.umami)umami.track('booking-confirmed',{revenue:${revenueEur},currency:'EUR'});})</script>`
      : "";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Jubilate School</title>
${umamiScript}
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5;}
.card{background:white;padding:3rem;border-radius:1rem;text-align:center;max-width:400px;box-shadow:0 2px 8px rgba(0,0,0,.1);}
h1{color:#030340;margin-bottom:1rem;}p{color:#666;}</style>
</head><body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`;
}
