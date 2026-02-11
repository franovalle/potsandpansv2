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
    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get auth header to verify the scanner is a business user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller
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

    // Find the claim by token
    const { data: claim, error: claimError } = await supabaseAdmin
      .from("donation_claims")
      .select("*, donation_campaigns(*)")
      .eq("token", token)
      .maybeSingle();

    if (claimError || !claim) {
      return new Response(JSON.stringify({ error: "Invalid QR code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (claim.status === "redeemed") {
      return new Response(JSON.stringify({ error: "This donation has already been redeemed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (claim.status !== "claimed") {
      return new Response(JSON.stringify({ error: "This donation has not been claimed yet or has expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check redemption window
    const campaign = claim.donation_campaigns;
    if (campaign && new Date(campaign.redemption_end_date) < new Date()) {
      return new Response(JSON.stringify({ error: "Redemption window has expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check 7-day redemption window from claim date
    if (claim.claimed_at) {
      const claimedDate = new Date(claim.claimed_at);
      const sevenDaysLater = new Date(claimedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (new Date() > sevenDaysLater) {
        return new Response(JSON.stringify({ error: "7-day redemption window has expired" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Mark as redeemed
    const { error: updateError } = await supabaseAdmin
      .from("donation_claims")
      .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
      .eq("id", claim.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to redeem" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        item_name: campaign?.item_name,
        message: "Donation redeemed successfully!",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
