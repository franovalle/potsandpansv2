import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import DashboardHeader from "@/components/DashboardHeader";
import { toast } from "@/hooks/use-toast";
import { Heart, Clock, Gift, CheckCircle } from "lucide-react";

const SUPABASE_URL = "https://dqvjkwrrxbtyziliyrkh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxdmprd3JyeGJ0eXppbGl5cmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDgxNTIsImV4cCI6MjA4NjQyNDE1Mn0.D8s6cg-qS4jOI1LI71mQbzqf8zLwQGmBu8ssaEjFAYQ";

interface ClaimWithCampaign {
  id: string;
  campaign_id: string;
  status: string;
  token: string;
  claimed_at: string | null;
  redeemed_at: string | null;
  expires_at: string;
  donation_campaigns: {
    item_name: string;
    business_name: string;
    redemption_end_date: string;
  } | null;
}

const HHADashboard = () => {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [pendingClaim, setPendingClaim] = useState<ClaimWithCampaign | null>(null);
  const [activeClaim, setActiveClaim] = useState<ClaimWithCampaign | null>(null);
  const [history, setHistory] = useState<ClaimWithCampaign[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [loadingData, setLoadingData] = useState(true);
  const demoResetDone = useRef(false);

  useEffect(() => {
    if (!authLoading && (!user || role !== "hha")) {
      navigate("/login", { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  const fetchClaims = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);

    let claims: any[] | null = null;

    // Try Supabase client with timeout
    try {
      const result = await Promise.race([
        supabase
          .from("donation_claims")
          .select("*, donation_campaigns(*)")
          .eq("hha_id", user.id)
          .order("created_at", { ascending: false }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);
      claims = result.data;
    } catch {
      // Fallback: direct REST using token from localStorage
      try {
        let token: string | null = null;
        const keys = Object.keys(localStorage);
        const sbKey = keys.find((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
        if (sbKey) {
          try {
            const stored = JSON.parse(localStorage.getItem(sbKey) || "");
            token = stored?.access_token || null;
          } catch { /* ignore parse error */ }
        }
        if (token) {
          const res = await fetch(
            `${SUPABASE_URL}/rest/v1/donation_claims?select=*,donation_campaigns(*)&hha_id=eq.${user.id}&order=created_at.desc`,
            {
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (res.ok) claims = await res.json();
        }
      } catch {
        // both failed
      }
    }

    if (claims) {
      const typed = claims as unknown as ClaimWithCampaign[];
      setPendingClaim(typed.find((c) => c.status === "pending") || null);
      const active = typed.find((c) => c.status === "claimed");
      setActiveClaim(active || null);
      if (active) setQrToken(active.token);
      setHistory(typed.filter((c) => c.status === "redeemed" || c.status === "expired"));
    }
    setLoadingData(false);
  }, [user]);

  // Demo reset: run once per session before fetching claims
  useEffect(() => {
    if (!user || demoResetDone.current) return;
    demoResetDone.current = true;

    const resetAndFetch = async () => {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/reset-hha-demo`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ hha_id: user.id }),
        });
      } catch {
        // ignore reset errors
      }
      fetchClaims();
    };
    resetAndFetch();
  }, [user, fetchClaims]);

  // QR token rotation every 60 seconds
  useEffect(() => {
    if (!activeClaim) return;
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setQrToken(activeClaim.token + "?" + Date.now());
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeClaim]);

  const handleClaim = async () => {
    if (!pendingClaim) return;
    setClaiming(true);

    const { data, error } = await supabase.functions.invoke("claim-donation", {
      body: { claim_id: pendingClaim.id },
    });

    if (error || data?.error) {
      toast({ title: "Claim Failed", description: data?.error || "An error occurred", variant: "destructive" });
    } else {
      toast({ title: "Donation Claimed!", description: "Show your QR code to redeem." });
      fetchClaims();
    }
    setClaiming(false);
  };

  if (authLoading || loadingData) {
    return (
      <Layout showNav={false}>
        <DashboardHeader />
        <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout showNav={false}>
      <DashboardHeader />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold font-heading mb-6 text-foreground">HHA DASHBOARD</h1>

        {/* Active claimed donation with QR */}
        {activeClaim && (
          <Card className="rounded-2xl border-primary/20 mb-6 animate-fade-in">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Active Donation
              </CardTitle>
              <CardDescription>Show this QR code to redeem your donation</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-lg font-semibold text-foreground">
                {activeClaim.donation_campaigns?.item_name} from {activeClaim.donation_campaigns?.business_name}
              </p>
              {/* Scannable QR Code Image */}
              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrToken)}`}
                  alt="QR Code for donation redemption"
                  className="w-48 h-48 rounded-xl"
                />
              </div>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Refreshes in {countdown}s</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Redeem within 7 days of claiming (by {activeClaim.claimed_at ? new Date(new Date(activeClaim.claimed_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString() : "N/A"})
              </p>
            </CardContent>
          </Card>
        )}

        {/* Pending donation to claim */}
        {!activeClaim && pendingClaim && (
          <Card className="rounded-2xl border-primary/20 mb-6 animate-fade-in">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Donation Available!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-lg text-foreground">
                Thank you for serving the Bronx. Claim your{" "}
                <span className="font-bold">{pendingClaim.donation_campaigns?.item_name}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                From {pendingClaim.donation_campaigns?.business_name} · Claim within 3 days
              </p>
              <Button onClick={handleClaim} disabled={claiming} size="lg" className="rounded-xl px-8">
                {claiming ? "Claiming..." : "Claim Donation"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No donations */}
        {!activeClaim && !pendingClaim && (
          <Card className="rounded-2xl mb-6">
            <CardContent className="py-12 text-center">
              <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">No donations available right now. Check back soon!</p>
            </CardContent>
          </Card>
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold font-heading mb-4 text-foreground">Donation History</h2>
            <div className="space-y-3">
              {history.map((claim) => (
                <Card key={claim.id} className="rounded-xl">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{claim.donation_campaigns?.item_name}</p>
                      <p className="text-sm text-muted-foreground">{claim.donation_campaigns?.business_name}</p>
                    </div>
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                      claim.status === "redeemed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {claim.status === "redeemed" ? "Redeemed" : "Expired"}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HHADashboard;
