import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin, getSupabaseUser } from "../_shared/supabase.ts";
import { captureException } from "../_shared/sentry.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const COUPON_CODE = "BIENVENUE";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const supabaseClient = getSupabaseUser(req);
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { slot_id, note, site_url, coupon_code } = await req.json();

    // Validate the slot exists
    const { data: slot } = await supabaseAdmin
      .from("availability_slots")
      .select("*, profiles!availability_slots_teacher_id_fkey(id, timezone)")
      .eq("id", slot_id)
      .single();

    if (!slot) {
      return new Response(
        JSON.stringify({ error: "Availability slot not found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Derive start/end times (slot is always 1 hour)
    const start_time = slot.start_time;
    const end_time = new Date(new Date(start_time).getTime() + 60 * 60 * 1000).toISOString();

    // Get student profile (for custom rate, email, timezone)
    const { data: studentProfile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, email, timezone, custom_hourly_rate_cents, coupon_used")
      .eq("id", user.id)
      .single();

    // Get current pricing
    const { data: pricing } = await supabaseAdmin
      .from("pricing")
      .select("*")
      .order("effective_from", { ascending: false })
      .limit(1)
      .single();

    if (!pricing) {
      return new Response(
        JSON.stringify({ error: "Pricing not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const hourlyRateCents =
      studentProfile?.custom_hourly_rate_cents ?? pricing.hourly_rate_cents;
    // Always 1 hour
    let price_cents = hourlyRateCents;

    // Coupon code validation
    let couponApplied = false;
    if (coupon_code) {
      const normalized = String(coupon_code).toUpperCase().trim();
      if (normalized !== COUPON_CODE) {
        return new Response(
          JSON.stringify({ error: "coupon_invalid" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (studentProfile?.coupon_used) {
        return new Response(
          JSON.stringify({ error: "coupon_already_used" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      price_cents = 0;
      couponApplied = true;
    }

    // Insert booking as pending
    const { data: booking, error: insertError } = await supabaseAdmin
      .from("bookings")
      .insert({
        availability_slot_id: slot_id,
        student_id: user.id,
        start_time,
        end_time,
        note: note || "",
        price_cents,
        status: "pending_confirmation",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({
          error:
            insertError.code === "23505"
              ? "Time slot is no longer available"
              : "Failed to create booking",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Mark coupon as used
    if (couponApplied) {
      await supabaseAdmin
        .from("profiles")
        .update({ coupon_used: true })
        .eq("id", user.id);
    }

    // Free session: skip Stripe, notify teacher directly
    if (price_cents === 0) {
      await supabaseAdmin.functions.invoke("send-email", {
        body: { type: "new_booking_teacher", booking_id: booking.id },
      });

      return new Response(JSON.stringify({ free: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Stripe Checkout Session (authorize only, don't capture)
    const siteUrl = site_url || Deno.env.get("SITE_URL") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_intent_data: {
        capture_method: "manual",
      },
      customer_email: studentProfile?.email || user.email,
      line_items: [
        {
          price_data: {
            currency: pricing.currency,
            unit_amount: price_cents,
            product_data: {
              name: `Jubilate School — 1h`,
              description: `Session on ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: studentProfile?.timezone || "Europe/Paris" }).format(new Date(start_time))}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: booking.id,
        student_name: `${studentProfile?.first_name || ""} ${studentProfile?.last_name || ""}`.trim(),
      },
      success_url: `${siteUrl}/app/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/app/booking/cancel?booking_id=${booking.id}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    captureException(err, { function: "create-checkout-session" });
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
