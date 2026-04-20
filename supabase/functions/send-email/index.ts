import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { captureException } from "../_shared/sentry.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:3000";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, booking_id, slot_id } = await req.json();

    // Fetch teacher profile (shared across all branches)
    const { data: teacherProfile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("role", "teacher")
      .limit(1)
      .single();

    // Slot-reservation email: fetch slot + reserved student instead of a booking
    if (type === "slot_reserved_student") {
      const { data: slot } = await supabaseAdmin
        .from("availability_slots")
        .select("*, profiles!availability_slots_reserved_for_student_id_fkey(first_name, last_name, email, preferred_lang, timezone)")
        .eq("id", slot_id)
        .single();

      if (!slot || !slot.reserved_for_student_id) {
        return new Response(JSON.stringify({ error: "Reserved slot not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const lang = slot.profiles?.preferred_lang || "fr";
      const studentEmail = slot.profiles?.email;
      const studentTz = slot.profiles?.timezone || "Europe/Paris";
      const teacherTz = teacherProfile?.timezone || "Europe/Paris";

      const fmt = (tz: string, locale: string) =>
        new Date(slot.start_time).toLocaleString(locale, {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: tz,
        });

      const dateStrStudent = fmt(studentTz, lang === "fr" ? "fr-FR" : "en-US");
      const dateStrTeacherForStudent = fmt(teacherTz, lang === "fr" ? "fr-FR" : "en-US");
      const bookUrl = `${SITE_URL}/app/calendar`;

      const subject =
        lang === "fr"
          ? "Un créneau vous est réservé — à confirmer"
          : "A slot is reserved for you — please confirm";

      const html =
        lang === "fr"
          ? `
        <h2>Un créneau vous est réservé</h2>
        <p>Emmanuelle a bloqué un créneau pour vous suite à votre échange.</p>
        <p><strong>Date :</strong> ${dateStrStudent}</p>
        <p style="color:#888;font-size:13px;"><strong>Heure prof :</strong> ${dateStrTeacherForStudent}</p>
        <p>Merci de confirmer en le réservant dès que possible :</p>
        <p style="margin-top:16px;">
          <a href="${bookUrl}" style="background:#030340;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Confirmer le créneau</a>
        </p>
      `
          : `
        <h2>A slot has been reserved for you</h2>
        <p>Emmanuelle has blocked a slot for you following your conversation.</p>
        <p><strong>Date:</strong> ${dateStrStudent}</p>
        <p style="color:#888;font-size:13px;"><strong>Teacher's time:</strong> ${dateStrTeacherForStudent}</p>
        <p>Please confirm by booking it as soon as possible:</p>
        <p style="margin-top:16px;">
          <a href="${bookUrl}" style="background:#030340;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Confirm the slot</a>
        </p>
      `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Jubilate School <noreply@school.jubilate.fr>",
          to: [studentEmail],
          subject,
          html,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        console.error("Resend error:", resData);
        return new Response(JSON.stringify({ error: "Failed to send email" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch booking with student profile
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select(
        "*, profiles!bookings_student_id_fkey(first_name, last_name, email, preferred_lang, timezone)",
      )
      .eq("id", booking_id)
      .single();

    if (!booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const studentLang = booking.profiles?.preferred_lang || "fr";
    const studentName = `${booking.profiles?.first_name || ""} ${booking.profiles?.last_name || ""}`.trim() || "Student";
    const studentEmail = booking.profiles?.email;
    const teacherEmail = teacherProfile?.email;

    const studentTz = booking.profiles?.timezone || "Europe/Paris";
    const teacherTz = teacherProfile?.timezone || "Europe/Paris";

    const fmtDate = (tz: string, locale: string) =>
      new Date(booking.start_time).toLocaleString(locale, {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: tz,
      });

    // Primary date string for each recipient
    const dateStrStudent = fmtDate(
      studentTz,
      studentLang === "fr" ? "fr-FR" : "en-US",
    );
    const dateStrTeacher = fmtDate(teacherTz, "fr-FR");
    // Secondary (counterpart) date strings
    const dateStrStudentForTeacher = fmtDate(studentTz, "fr-FR");
    const dateStrTeacherForStudent = fmtDate(
      teacherTz,
      studentLang === "fr" ? "fr-FR" : "en-US",
    );

    const confirmUrl = `${SUPABASE_URL}/functions/v1/confirm-booking?token=${booking.confirmation_token}`;
    const rejectUrl = `${SUPABASE_URL}/functions/v1/reject-booking?token=${booking.confirmation_token}`;

    let to: string;
    let subject: string;
    let html: string;

    switch (type) {
      case "new_booking_teacher":
        to = teacherEmail;
        subject = `Nouvelle demande de cours — ${studentName}`;
        html = `
          <h2>Nouvelle demande de réservation</h2>
          <p><strong>Élève :</strong> ${studentName}</p>
          <p><strong>Date (votre heure) :</strong> ${dateStrTeacher}</p>
          <p style="color:#888;font-size:13px;"><strong>Heure élève :</strong> ${dateStrStudentForTeacher}</p>
          ${booking.note ? `<p><strong>Note :</strong> ${booking.note}</p>` : ""}
          <br/>
          <p>
            <a href="${confirmUrl}" style="background:#4caf50;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin-right:12px;">✓ Confirmer</a>
            <a href="${rejectUrl}" style="background:#f44336;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">✗ Refuser</a>
          </p>
          <br/>
          <p style="color:#888;font-size:12px;">Si vous ne répondez pas sous 48h, la demande sera automatiquement annulée.</p>
        `;
        break;

      case "booking_confirmed_student": {
        const zoomBtnStudent = booking.zoom_meeting_link
          ? studentLang === "fr"
            ? `<p style="margin-top:16px;"><a href="${booking.zoom_meeting_link}" style="background:#2D8CFF;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Rejoindre sur Zoom</a></p>`
            : `<p style="margin-top:16px;"><a href="${booking.zoom_meeting_link}" style="background:#2D8CFF;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Join on Zoom</a></p>`
          : "";
        to = studentEmail;
        subject =
          studentLang === "fr"
            ? "Votre cours est confirmé !"
            : "Your session is confirmed!";
        html =
          studentLang === "fr"
            ? `
          <h2>Réservation confirmée</h2>
          <p>Votre cours a été confirmé.</p>
          <p><strong>Date :</strong> ${dateStrStudent}</p>
          <p style="color:#888;font-size:13px;"><strong>Heure prof :</strong> ${dateStrTeacherForStudent}</p>
          ${zoomBtnStudent}
          <p>À bientôt !</p>
        `
            : `
          <h2>Booking Confirmed</h2>
          <p>Your session has been confirmed.</p>
          <p><strong>Date:</strong> ${dateStrStudent}</p>
          <p style="color:#888;font-size:13px;"><strong>Teacher's time:</strong> ${dateStrTeacherForStudent}</p>
          ${zoomBtnStudent}
          <p>See you soon!</p>
        `;
        break;
      }

      case "booking_confirmed_teacher": {
        const zoomBtnTeacher = booking.zoom_meeting_link
          ? `<p style="margin-top:16px;"><a href="${booking.zoom_meeting_link}" style="background:#2D8CFF;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Rejoindre sur Zoom</a></p>`
          : "";
        to = teacherEmail;
        subject = `Votre cours avec ${studentName} est confirmé !`;
        html = `
          <h2>Réservation confirmée</h2>
          <p>Votre cours a été confirmé.</p>
          <p><strong>Date :</strong> ${dateStrTeacher}</p>
          <p style="color:#888;font-size:13px;"><strong>Heure pour l'eleve :</strong> ${dateStrStudentForTeacher}</p>
          ${zoomBtnTeacher}
          <p>À bientôt !</p>
        `;
        break;
      }

      case "booking_rejected_student":
        to = studentEmail;
        subject =
          studentLang === "fr"
            ? "Votre demande de cours n'a pas été acceptée"
            : "Your booking request was not accepted";
        html =
          studentLang === "fr"
            ? `
          <h2>Demande non acceptée</h2>
          <p>Votre demande de cours du ${dateStrStudent} n'a pas été acceptée.</p>
          <p>Votre carte bancaire n'a pas été débitée.</p>
          <p>N'hésitez pas à réserver un autre créneau.</p>
        `
            : `
          <h2>Booking Not Accepted</h2>
          <p>Your booking request for ${dateStrStudent} was not accepted.</p>
          <p>Your card was not charged.</p>
          <p>Feel free to book another slot.</p>
        `;
        break;

      case "booking_expired_student":
        to = studentEmail;
        subject =
          studentLang === "fr"
            ? "Votre demande de cours a expiré"
            : "Your booking request has expired";
        html =
          studentLang === "fr"
            ? `
          <h2>Demande expirée</h2>
          <p>Votre demande de cours du ${dateStrStudent} a expiré car elle n'a pas été traitée à temps.</p>
          <p>Votre carte bancaire n'a pas été débitée.</p>
          <p>N'hésitez pas à réserver un autre créneau.</p>
        `
            : `
          <h2>Booking Expired</h2>
          <p>Your booking request for ${dateStrStudent} has expired because it was not processed in time.</p>
          <p>Your card was not charged.</p>
          <p>Feel free to book another slot.</p>
        `;
        break;

      case "booking_cancelled_by_student_teacher":
        to = teacherEmail;
        subject = `Cours annulé par l'élève — ${studentName}`;
        html = `
          <h2>Cours annulé</h2>
          <p><strong>Élève :</strong> ${studentName}</p>
          <p><strong>Date (votre heure) :</strong> ${dateStrTeacher}</p>
          <p style="color:#888;font-size:13px;"><strong>Heure élève :</strong> ${dateStrStudentForTeacher}</p>
          <p>L'élève a annulé ce cours. Le paiement a été annulé ou remboursé.</p>
        `;
        break;

      case "booking_cancelled_by_teacher_student":
        to = studentEmail;
        subject =
          studentLang === "fr"
            ? "Votre cours a été annulé par le professeur"
            : "Your session was cancelled by the teacher";
        html =
          studentLang === "fr"
            ? `
          <h2>Cours annulé</h2>
          <p>Votre cours du ${dateStrStudent} a été annulé par le professeur.</p>
          <p>Si le paiement avait été capturé, vous serez remboursé sous quelques jours.</p>
          <p>N'hésitez pas à réserver un autre créneau.</p>
        `
            : `
          <h2>Session Cancelled</h2>
          <p>Your session on ${dateStrStudent} was cancelled by the teacher.</p>
          <p>If the payment was captured, you will be refunded within a few days.</p>
          <p>Feel free to book another slot.</p>
        `;
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown email type: ${type}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
    }

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Jubilate School <noreply@school.jubilate.fr>",
        to: [to],
        subject,
        html,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      console.error("Resend error:", resData);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    captureException(err, { function: "send-email" });
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
