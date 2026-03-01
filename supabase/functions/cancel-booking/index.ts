import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin, getSupabaseUser } from "../_shared/supabase.ts";
import { captureException } from "../_shared/sentry.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const supabaseUser = getSupabaseUser(req);
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get caller's profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { booking_id } = await req.json();

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: "Missing booking_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the booking
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (!booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate status
    if (!["pending_confirmation", "confirmed"].includes(booking.status)) {
      return new Response(
        JSON.stringify({ error: "Booking cannot be cancelled in its current status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const role = profile.role as "student" | "teacher";

    // Validate caller has permission
    if (role === "student") {
      if (booking.student_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Not authorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Student can only cancel if class is 48h+ away
      const hoursUntilClass =
        (new Date(booking.start_time).getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilClass < 48) {
        return new Response(
          JSON.stringify({ error: "Cannot cancel less than 48 hours before the class" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    // Teacher can cancel any booking at any time (no extra checks)

    // Handle Stripe
    if (booking.stripe_payment_intent_id) {
      if (booking.status === "pending_confirmation") {
        // Cancel the payment intent (authorization not yet captured)
        await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id);
      } else if (booking.status === "confirmed") {
        // Refund the captured payment
        await stripe.refunds.create({
          payment_intent: booking.stripe_payment_intent_id,
        });
      }
    }

    // Update booking status
    const newStatus =
      role === "student" ? "cancelled_by_student" : "cancelled_by_teacher";

    await supabaseAdmin
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", booking.id);

    // Send notification emails
    if (role === "student") {
      // Notify teacher
      await supabaseAdmin.functions.invoke("send-email", {
        body: {
          type: "booking_cancelled_by_student_teacher",
          booking_id: booking.id,
        },
      });
    } else {
      // Notify student
      await supabaseAdmin.functions.invoke("send-email", {
        body: {
          type: "booking_cancelled_by_teacher_student",
          booking_id: booking.id,
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    captureException(err, { function: "cancel-booking" });
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
