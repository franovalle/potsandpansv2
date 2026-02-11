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
    const { campaign_id, agency_id, quantity, business_name } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all agencies or just the specified one
    let agencies: { id: string; name: string }[] = [];
    if (agency_id) {
      const { data } = await supabaseAdmin.from("agencies").select("id, name").eq("id", agency_id);
      agencies = data || [];
    } else {
      const { data } = await supabaseAdmin.from("agencies").select("id, name");
      agencies = data || [];
    }

    if (agencies.length === 0) {
      return new Response(JSON.stringify({ error: "No agencies found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Distribute quantity across agencies
    const perAgency = Math.floor(quantity / agencies.length);
    let remainder = quantity % agencies.length;

    const claims: { campaign_id: string; hha_id: string }[] = [];

    for (const agency of agencies) {
      let agencyQty = perAgency + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;

      if (agencyQty === 0) continue;

      // Get all HHA profiles for this agency via roster
      const { data: hhaProfiles } = await supabaseAdmin
        .from("hha_profiles")
        .select("user_id, roster_id, rosters!inner(agency_id)")
        .eq("rosters.agency_id", agency.id);

      if (!hhaProfiles || hhaProfiles.length === 0) continue;

      // Get last donation date for each HHA
      const hhaIds = hhaProfiles.map((p) => p.user_id);
      const { data: existingClaims } = await supabaseAdmin
        .from("donation_claims")
        .select("hha_id, created_at")
        .in("hha_id", hhaIds)
        .order("created_at", { ascending: false });

      // Build priority: never received first, then oldest last donation
      const lastDonation: Record<string, string> = {};
      if (existingClaims) {
        for (const c of existingClaims) {
          if (!lastDonation[c.hha_id]) {
            lastDonation[c.hha_id] = c.created_at;
          }
        }
      }

      const sorted = [...hhaProfiles].sort((a, b) => {
        const aDate = lastDonation[a.user_id];
        const bDate = lastDonation[b.user_id];
        if (!aDate && bDate) return -1;
        if (aDate && !bDate) return 1;
        if (!aDate && !bDate) return 0;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      });

      const toAssign = sorted.slice(0, agencyQty);
      for (const hha of toAssign) {
        claims.push({ campaign_id, hha_id: hha.user_id });
      }
    }

    // Insert all claims
    if (claims.length > 0) {
      const { error } = await supabaseAdmin.from("donation_claims").insert(
        claims.map((c) => ({
          campaign_id: c.campaign_id,
          hha_id: c.hha_id,
          status: "pending",
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        }))
      );

      if (error) {
        return new Response(JSON.stringify({ error: "Failed to distribute: " + error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, distributed: claims.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
