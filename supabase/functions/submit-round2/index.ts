
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  // Handle browser CORS checks.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Only POST submissions are accepted." }, 405);
  }

  // Read the submitted data.
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const teamId = String(body.team_id ?? "").trim();
  const teamName = String(body.team_name ?? "").trim();
  const roundId = String(body.round_id ?? "R2").trim();
  const completionTime = Number(body.completion_time);
  const responses = body.responses;

  // Validate team details.
  if (
    !teamId ||
    teamId.length > 80 ||
    !teamName ||
    teamName.length > 120
  ) {
    return json(
      { error: "A valid Team ID and Team Name are required." },
      400,
    );
  }

  if (roundId !== "R2") {
    return json({ error: "Invalid round ID." }, 400);
  }

  if (
    !Number.isInteger(completionTime) ||
    completionTime < 0 ||
    completionTime > 86400
  ) {
    return json({ error: "Invalid completion time." }, 400);
  }

  if (
    !responses ||
    typeof responses !== "object" ||
    Array.isArray(responses)
  ) {
    return json(
      { error: "Responses must be a JSON object." },
      400,
    );
  }

  // Read Supabase's project URL and your server-side secret.
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = Deno.env.get("ROUND2_SECRET_KEY");

  if (!supabaseUrl || !secretKey) {
    console.error(
      "Supabase URL or server-side secret key is not configured.",
    );

    return json(
      {
        error:
          "Submission service is not configured. Please alert the organiser.",
      },
      500,
    );
  }

  // Create a server-side client to save submissions.
  const admin = createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error } = await admin
    .from("round_submissions")
    .insert({
      team_id: teamId,
      team_name: teamName,
      round_id: roundId,
      responses,
      completion_time: completionTime,
    });

  if (error) {
    // Prevent the same team from submitting Round 2 twice.
    if (error.code === "23505") {
      return json(
        { error: "This Team ID has already submitted Round 2." },
        409,
      );
    }

    console.error(
      "Submission insert failed:",
      error.code,
      error.message,
    );

    return json(
      {
        error:
          "Could not save this submission. Please try again or contact the organiser.",
      },
      500,
    );
  }

  return json(
    { ok: true, message: "Submission saved." },
    201,
  );
});
