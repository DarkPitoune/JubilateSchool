import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { captureException } from "../_shared/sentry.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { student_name, student_email } = await req.json();

    if (!student_name || !student_email) {
      return new Response(
        JSON.stringify({ error: "Missing student_name or student_email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch teacher profile
    const { data: teacher } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("role", "teacher")
      .limit(1)
      .single();

    if (!teacher?.email) {
      return new Response(
        JSON.stringify({ error: "Teacher not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Jubilate School <noreply@school.jubilate.fr>",
        to: [teacher.email],
        subject: `Nouvel eleve inscrit — ${student_name}`,
        html: `
          <h2>Nouvel eleve inscrit</h2>
          <p><strong>Nom :</strong> ${student_name}</p>
          <p><strong>Email :</strong> ${student_email}</p>
        `,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      console.error("Resend error:", resData);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    captureException(err, { function: "notify-new-student" });
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
