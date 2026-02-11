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
    const { full_name, agency_id, email, password } = await req.json();

    if (!full_name || !agency_id || !email || !password) {
      return new Response(JSON.stringify({ error: "All fields are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify name + agency against roster
    const { data: rosterEntry, error: rosterError } = await supabaseAdmin
      .from("rosters")
      .select("id, full_name, agency_id")
      .eq("agency_id", agency_id)
      .ilike("full_name", full_name.trim())
      .maybeSingle();

    if (rosterError || !rosterEntry) {
      return new Response(
        JSON.stringify({ error: "Not found on agency roster. Please check your name and agency." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if roster entry already has an account
    const { data: existingProfile } = await supabaseAdmin
      .from("hha_profiles")
      .select("id")
      .eq("roster_id", rosterEntry.id)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: "An account already exists for this roster entry." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // Insert role
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "hha" });

    // Insert HHA profile
    await supabaseAdmin.from("hha_profiles").insert({
      user_id: userId,
      roster_id: rosterEntry.id,
      full_name: rosterEntry.full_name,
    });

    // Auto-assign eligible donations to new HHA
    const { data: activeCampaigns } = await supabaseAdmin
      .from("donation_campaigns")
      .select("id, quantity, agency_id")
      .eq("agency_id", rosterEntry.agency_id)
      .gte("redemption_end_date", new Date().toISOString().split("T")[0]);

    if (activeCampaigns && activeCampaigns.length > 0) {
      for (const campaign of activeCampaigns) {
        // Count existing claims for this campaign
        const { count } = await supabaseAdmin
          .from("donation_claims")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign.id);

        const claimed = count || 0;
        const available = campaign.quantity - claimed;

        if (available > 0) {
          // Check this HHA doesn't already have a claim for this campaign
          const { data: existingClaim } = await supabaseAdmin
            .from("donation_claims")
            .select("id")
            .eq("campaign_id", campaign.id)
            .eq("hha_id", userId)
            .maybeSingle();

          if (!existingClaim) {
            await supabaseAdmin.from("donation_claims").insert({
              campaign_id: campaign.id,
              hha_id: userId,
              status: "pending",
              expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            });
            break; // Only assign one donation at a time
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
