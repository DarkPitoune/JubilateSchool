import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin, getSupabaseUser } from "../_shared/supabase.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

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

    const {
      availability_range_id,
      start_time,
      end_time,
      duration_minutes,
      note,
      site_url,
    } = await req.json();

    // Validate the availability range exists
    const { data: range } = await supabaseAdmin
      .from("availability_ranges")
      .select("*")
      .eq("id", availability_range_id)
      .single();

    if (!range) {
      return new Response(
        JSON.stringify({ error: "Availability range not found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check booking is within the range
    if (
      new Date(start_time) < new Date(range.start_time) ||
      new Date(end_time) > new Date(range.end_time)
    ) {
      return new Response(
        JSON.stringify({ error: "Booking outside availability range" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check for overlapping bookings
    const { data: overlapping } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("availability_range_id", availability_range_id)
      .in("status", ["pending_confirmation", "confirmed"])
      .lt("start_time", end_time)
      .gt("end_time", start_time);

    if (overlapping && overlapping.length > 0) {
      return new Response(
        JSON.stringify({ error: "Time slot is no longer available" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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

    const price_cents = Math.round(
      (duration_minutes / 60) * pricing.hourly_rate_cents
    );

    // Insert booking as pending
    const { data: booking, error: insertError } = await supabaseAdmin
      .from("bookings")
      .insert({
        availability_range_id,
        student_id: user.id,
        start_time,
        end_time,
        duration_minutes,
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
            insertError.code === "23P01"
              ? "Time slot is no longer available"
              : "Failed to create booking",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get student profile for Stripe metadata and timezone
    const { data: studentProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, timezone")
      .eq("id", user.id)
      .single();

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
              name: `Jubilate School — ${duration_minutes} min`,
              description: `Session on ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: studentProfile?.timezone || "Europe/Paris" }).format(new Date(start_time))}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: booking.id,
        student_name: studentProfile?.full_name || "",
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
