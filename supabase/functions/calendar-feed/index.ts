import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { captureException } from "../_shared/sentry.ts";

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toICSDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Missing token", { status: 400 });
    }

    // Look up profile by personal_access_token
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, role, full_name")
      .eq("personal_access_token", token)
      .single();

    if (!profile) {
      return new Response("Invalid token", { status: 401 });
    }

    // Cutoff: 1 day in the past
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch confirmed bookings
    let query = supabaseAdmin
      .from("bookings")
      .select("id, start_time, end_time, zoom_meeting_link, profiles!bookings_student_id_fkey(full_name)")
      .eq("status", "confirmed")
      .gte("end_time", cutoff)
      .order("start_time", { ascending: true });

    if (profile.role === "student") {
      query = query.eq("student_id", profile.id);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error("Query error:", error);
      return new Response("Internal error", { status: 500 });
    }

    // Build ICS
    const events = (bookings || []).map((b) => {
      const summary =
        profile.role === "teacher"
          ? `Jubilate — ${(b.profiles as { full_name: string })?.full_name || "Student"}`
          : "Jubilate School";

      const lines = [
        "BEGIN:VEVENT",
        `UID:${b.id}@jubilate.school`,
        `DTSTART:${toICSDate(b.start_time)}`,
        `DTEND:${toICSDate(b.end_time)}`,
        `SUMMARY:${icsEscape(summary)}`,
      ];

      if (b.zoom_meeting_link) {
        lines.push(`LOCATION:${icsEscape(b.zoom_meeting_link)}`);
      }

      lines.push("END:VEVENT");
      return lines.join("\r\n");
    });

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Jubilate School//Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:Jubilate School`,
      ...events,
      "END:VCALENDAR",
    ].join("\r\n");

    return new Response(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="jubilate.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Error:", err);
    captureException(err, { function: "calendar-feed" });
    return new Response("Internal error", { status: 500 });
  }
});
