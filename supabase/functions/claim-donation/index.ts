import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { claim_id } = await req.json();
    if (!claim_id) {
      return new Response(JSON.stringify({ error: "claim_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check the HHA doesn't already have an active claimed donation
    const { data: activeClaims } = await supabaseAdmin
      .from("donation_claims")
      .select("id")
      .eq("hha_id", user.id)
      .eq("status", "claimed");

    if (activeClaims && activeClaims.length > 0) {
      return new Response(JSON.stringify({ error: "You already have an active donation. Redeem it first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify claim belongs to user and is pending
    const { data: claim } = await supabaseAdmin
      .from("donation_claims")
      .select("*")
      .eq("id", claim_id)
      .eq("hha_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (!claim) {
      return new Response(JSON.stringify({ error: "Claim not found or already claimed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if expired
    if (new Date(claim.expires_at) < new Date()) {
      await supabaseAdmin
        .from("donation_claims")
        .update({ status: "expired" })
        .eq("id", claim_id);
      return new Response(JSON.stringify({ error: "This claim has expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate new token and claim it
    const newToken = crypto.randomUUID() + "-" + Date.now().toString(36);
    const { error: updateError } = await supabaseAdmin
      .from("donation_claims")
      .update({
        status: "claimed",
        claimed_at: new Date().toISOString(),
        token: newToken,
      })
      .eq("id", claim_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to claim" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, token: newToken }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
