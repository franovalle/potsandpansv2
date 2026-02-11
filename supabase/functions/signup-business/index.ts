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
    const { business_name, business_type, email, password } = await req.json();

    if (!business_name || !email || !password) {
      return new Response(JSON.stringify({ error: "Business name, email, and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "business" });

    // Insert business profile
    await supabaseAdmin.from("business_profiles").insert({
      user_id: userId,
      business_name,
      business_type: business_type || null,
    });

    // If business is "Bronx Deli", auto-create demo campaign
    if (business_name.trim().toLowerCase() === "bronx deli") {
      const { data: agency } = await supabaseAdmin
        .from("agencies")
        .select("id")
        .eq("name", "Bronx Home Care Services")
        .maybeSingle();

      if (agency) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        const { data: campaign } = await supabaseAdmin
          .from("donation_campaigns")
          .insert({
            business_id: userId,
            business_name: business_name.trim(),
            item_name: "Chicken Sandwich",
            quantity: 1,
            agency_id: agency.id,
            redemption_end_date: endDate.toISOString().split("T")[0],
          })
          .select()
          .single();

        // Distribute to eligible HHAs in the agency
        if (campaign) {
          const { data: hhaProfiles } = await supabaseAdmin
            .from("hha_profiles")
            .select("user_id, roster_id, rosters!inner(agency_id)")
            .eq("rosters.agency_id", agency.id);

          if (hhaProfiles && hhaProfiles.length > 0) {
            // Get existing claims to prioritize fairly
            const hhaIds = hhaProfiles.map((p) => p.user_id);
            const { data: existingClaims } = await supabaseAdmin
              .from("donation_claims")
              .select("hha_id, created_at")
              .in("hha_id", hhaIds)
              .order("created_at", { ascending: false });

            const lastDonation: Record<string, string> = {};
            if (existingClaims) {
              for (const c of existingClaims) {
                if (!lastDonation[c.hha_id]) lastDonation[c.hha_id] = c.created_at;
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

            const toAssign = sorted.slice(0, campaign.quantity);
            if (toAssign.length > 0) {
              await supabaseAdmin.from("donation_claims").insert(
                toAssign.map((hha) => ({
                  campaign_id: campaign.id,
                  hha_id: hha.user_id,
                  status: "pending",
                  expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                }))
              );
            }
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
