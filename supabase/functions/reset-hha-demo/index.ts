import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { hha_id } = await req.json();
    if (!hha_id) {
      return new Response(JSON.stringify({ error: "hha_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Delete all existing claims for this user
    await supabase.from("donation_claims").delete().eq("hha_id", hha_id);

    // Find the Chicken Sandwich campaign from Bronx Deli
    const { data: campaign } = await supabase
      .from("donation_campaigns")
      .select("id")
      .ilike("item_name", "%chicken sandwich%")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!campaign) {
      return new Response(
        JSON.stringify({ error: "No Chicken Sandwich campaign found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a fresh pending claim
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { error: insertError } = await supabase.from("donation_claims").insert({
      hha_id,
      campaign_id: campaign.id,
      status: "pending",
      expires_at: expiresAt,
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
