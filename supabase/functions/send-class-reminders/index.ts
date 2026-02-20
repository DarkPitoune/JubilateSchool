import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import * as webpush from "https://esm.sh/jsr/@negrel/webpush@0.3.0";
import { supabaseAdmin } from "../_shared/supabase.ts";

const siteUrl = Deno.env.get("SITE_URL")!;

const vapidKeys = await webpush.importVapidKeys(
  {
    publicKey: Deno.env.get("VAPID_PUBLIC_KEY")!,
    privateKey: Deno.env.get("VAPID_PRIVATE_KEY")!,
  },
  { extractable: false }
);

const appServer = await webpush.ApplicationServer.new({
  contactInformation: "mailto:contact@jubilateschool.com",
  vapidKeys,
});

serve(async (_req) => {
  try {
    // Find confirmed bookings starting in 9-15 minutes with no reminder sent yet
    const now = new Date();
    const from = new Date(now.getTime() + 9 * 60 * 1000).toISOString();
    const to = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

    const { data: bookings, error: bookingsErr } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, start_time, student_id, availability_ranges!inner(teacher_id)"
      )
      .eq("status", "confirmed")
      .is("reminder_sent_at", null)
      .gte("start_time", from)
      .lte("start_time", to);

    if (bookingsErr) throw bookingsErr;
    if (!bookings || bookings.length === 0) {
      return json({ reminded: 0 });
    }

    let reminded = 0;

    for (const booking of bookings) {
      const teacherId = (booking as any).availability_ranges?.teacher_id;
      const studentId = booking.student_id;
      const userIds = [studentId, teacherId].filter(Boolean) as string[];

      // Fetch profiles for language
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, preferred_lang")
        .in("id", userIds);

      // Fetch all push subscriptions for both users
      const { data: subs } = await supabaseAdmin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth, user_id")
        .in("user_id", userIds);

      if (subs && subs.length > 0) {
        const startTime = new Date(booking.start_time);
        const timeStr = startTime.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        for (const sub of subs) {
          const lang =
            profiles?.find((p: any) => p.id === sub.user_id)
              ?.preferred_lang || "fr";

          const title =
            lang === "fr" ? "Cours dans 10 minutes" : "Class in 10 minutes";
          const body =
            lang === "fr"
              ? `Votre cours commence à ${timeStr}`
              : `Your class starts at ${timeStr}`;

          const success = await sendPush(sub, {
            title,
            body,
            url: `${siteUrl}/app/bookings`,
          });

          // Remove stale subscriptions
          if (!success) {
            await supabaseAdmin
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
          }
        }
      }

      // Mark reminder as sent (even if no subs — avoid retry loops)
      await supabaseAdmin
        .from("bookings")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", booking.id);

      reminded++;
    }

    return json({ reminded });
  } catch (err) {
    console.error("Error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url: string }
): Promise<boolean> {
  try {
    const subscriber = appServer.subscribe({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    });

    await subscriber.pushTextMessage(JSON.stringify(payload), {});
    return true;
  } catch (err) {
    // PushMessageError with 410/404 means subscription is gone
    if (err instanceof webpush.PushMessageError) {
      const status = err.response?.status;
      if (status === 410 || status === 404) return false;
    }
    console.error("Push send error:", err);
    return false;
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
