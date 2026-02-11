import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import DashboardHeader from "@/components/DashboardHeader";
import { toast } from "@/hooks/use-toast";
import { Heart, Clock, Gift, CheckCircle } from "lucide-react";

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

  useEffect(() => {
    if (!authLoading && (!user || role !== "hha")) {
      navigate("/login", { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  const fetchClaims = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);

    const { data: claims } = await supabase
      .from("donation_claims")
      .select("*, donation_campaigns(*)")
      .eq("hha_id", user.id)
      .order("created_at", { ascending: false });

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

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  // QR token rotation every 60 seconds
  useEffect(() => {
    if (!activeClaim) return;
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Generate a display-only rotation (the real token stays the same for validation)
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
      <Layout>
        <DashboardHeader />
        <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <DashboardHeader />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold font-heading mb-6 text-foreground">Your Dashboard</h1>

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
              {/* QR Code display using a simple text-based approach */}
              <div className="bg-foreground text-background p-6 rounded-xl inline-block mx-auto font-mono text-xs break-all max-w-xs">
                <div className="mb-2 text-sm font-bold">QR TOKEN</div>
                {qrToken.substring(0, 20)}...
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
