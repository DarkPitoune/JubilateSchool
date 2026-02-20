import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

async function createZoomMeeting(
  startTime: string,
  durationMinutes: number,
  studentName: string
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
      }
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

    // Find the booking by confirmation token
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("*, profiles!bookings_student_id_fkey(full_name)")
      .eq("confirmation_token", token)
      .eq("status", "pending_confirmation")
      .single();

    if (!booking) {
      return new Response(
        renderHTML(
          "Not found",
          "Booking not found or already processed."
        ),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    // Capture the Stripe payment
    if (booking.stripe_payment_intent_id) {
      await stripe.paymentIntents.capture(booking.stripe_payment_intent_id);
    }

    // Create Zoom meeting (best-effort)
    const studentName = booking.profiles?.full_name || "Student";
    const zoomLink = await createZoomMeeting(
      booking.start_time,
      booking.duration_minutes,
      studentName
    );

    // Update booking status
    await supabaseAdmin
      .from("bookings")
      .update({ status: "confirmed", zoom_meeting_link: zoomLink })
      .eq("id", booking.id);

    // Send confirmation emails
    await supabaseAdmin.functions.invoke("send-email", {
      body: {
        type: "booking_confirmed_student",
        booking_id: booking.id,
      },
    });

    return new Response(
      renderHTML(
        "Booking Confirmed ✓",
        "The payment has been captured and the student has been notified."
      ),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      renderHTML("Error", `Something went wrong: ${err.message}`),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html" } }
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
