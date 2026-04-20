import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin, getSupabaseUser } from "../_shared/supabase.ts";
import { captureException } from "../_shared/sentry.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const BATCH_SIZE = 20;

interface Diagnostic {
  fee_cents: number;
  pi_status?: string;
  latest_charge_present?: boolean;
  balance_transaction_present?: boolean;
  error?: string;
}

async function diagnoseIntent(id: string): Promise<Diagnostic> {
  try {
    const pi = await stripe.paymentIntents.retrieve(id, {
      expand: ["latest_charge.balance_transaction"],
    });
    const charge = pi.latest_charge;
    const chargeObj =
      charge && typeof charge === "object" ? (charge as Stripe.Charge) : null;
    const bt = chargeObj?.balance_transaction;
    const btObj =
      bt && typeof bt === "object" ? (bt as Stripe.BalanceTransaction) : null;
    const diag: Diagnostic = {
      fee_cents: btObj?.fee ?? 0,
      pi_status: pi.status,
      latest_charge_present: !!chargeObj,
      balance_transaction_present: !!btObj,
    };
    console.log(`[fetch-stripe-fees] ${id}`, JSON.stringify(diag));
    return diag;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[fetch-stripe-fees] ${id} FAILED: ${msg}`);
    return { fee_cents: 0, error: msg };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUser = getSupabaseUser(req);
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const debug = url.searchParams.get("debug") === "1";

    const { payment_intent_ids } = (await req.json()) as {
      payment_intent_ids?: string[];
    };

    if (!Array.isArray(payment_intent_ids)) {
      return new Response(JSON.stringify({ error: "Missing payment_intent_ids" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fees: Record<string, number> = {};
    const diagnostics: Record<string, Diagnostic> = {};

    for (let i = 0; i < payment_intent_ids.length; i += BATCH_SIZE) {
      const batch = payment_intent_ids.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (id) => [id, await diagnoseIntent(id)] as const),
      );
      for (const [id, diag] of results) {
        fees[id] = diag.fee_cents;
        diagnostics[id] = diag;
      }

      // Persist successful fees back to the booking row (self-healing backfill).
      const persistable = results.filter(
        ([, diag]) => !diag.error && diag.balance_transaction_present,
      );
      await Promise.all(
        persistable.map(([id, diag]) =>
          supabaseAdmin
            .from("bookings")
            .update({ stripe_fee_cents: diag.fee_cents })
            .eq("stripe_payment_intent_id", id),
        ),
      );
    }

    const body: Record<string, unknown> = { fees };
    if (debug) body.diagnostics = diagnostics;

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    captureException(err, { fn: "fetch-stripe-fees" });
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
