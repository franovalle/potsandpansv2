import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Layout from "@/components/Layout";
import DashboardHeader from "@/components/DashboardHeader";
import { toast } from "@/hooks/use-toast";
import { Plus, QrCode, Package } from "lucide-react";

const BusinessDashboard = () => {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignClaims, setCampaignClaims] = useState<Record<string, { claimed: number; redeemed: number }>>({});

  // Create donation form
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [endDate, setEndDate] = useState("");
  const [agencyId, setAgencyId] = useState("fair");
  const [creating, setCreating] = useState(false);

  // QR scanning
  const [scanMode, setScanMode] = useState(false);
  const [scanToken, setScanToken] = useState("");
  const [scanning, setScanning] = useState(false);

  const [businessProfile, setBusinessProfile] = useState<{ business_name: string } | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || role !== "business")) {
      navigate("/login", { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    supabase.from("agencies").select("id, name").then(({ data }) => {
      if (data) setAgencies(data);
    });

    supabase.from("business_profiles").select("business_name").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setBusinessProfile(data);
    });

    fetchCampaigns();
  }, [user]);

  const fetchCampaigns = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("donation_campaigns")
      .select("*")
      .eq("business_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setCampaigns(data);
      // Fetch claim stats for each campaign
      const stats: Record<string, { claimed: number; redeemed: number }> = {};
      for (const c of data) {
        const { data: claims } = await supabase
          .from("donation_claims")
          .select("status")
          .eq("campaign_id", c.id);
        if (claims) {
          stats[c.id] = {
            claimed: claims.filter((cl) => cl.status === "claimed" || cl.status === "redeemed").length,
            redeemed: claims.filter((cl) => cl.status === "redeemed").length,
          };
        }
      }
      setCampaignClaims(stats);
    }
  };

  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !businessProfile) return;
    setCreating(true);

    // Create campaign
    const { data: campaign, error } = await supabase
      .from("donation_campaigns")
      .insert({
        business_id: user.id,
        business_name: businessProfile.business_name,
        item_name: itemName,
        quantity,
        agency_id: agencyId === "fair" ? null : agencyId,
        redemption_end_date: endDate,
      })
      .select()
      .single();

    if (error || !campaign) {
      toast({ title: "Error", description: error?.message || "Failed to create", variant: "destructive" });
      setCreating(false);
      return;
    }

    // Distribute
    const { data: distResult } = await supabase.functions.invoke("distribute-donations", {
      body: {
        campaign_id: campaign.id,
        agency_id: agencyId === "fair" ? null : agencyId,
        quantity,
        business_name: businessProfile.business_name,
      },
    });

    toast({
      title: "Donation Created!",
      description: `Distributed to ${distResult?.distributed || 0} eligible HHAs`,
    });

    setItemName("");
    setQuantity(1);
    setEndDate("");
    setAgencyId("fair");
    setCreating(false);
    fetchCampaigns();
  };

  const handleScanQR = async () => {
    if (!scanToken.trim()) return;
    setScanning(true);

    const { data, error } = await supabase.functions.invoke("validate-qr", {
      body: { token: scanToken.trim() },
    });

    if (error || data?.error) {
      toast({ title: "Validation Failed", description: data?.error || "Invalid QR code", variant: "destructive" });
    } else {
      toast({ title: "Success!", description: `${data.item_name} redeemed successfully!` });
      setScanToken("");
      setScanMode(false);
      fetchCampaigns();
    }
    setScanning(false);
  };

  if (authLoading) {
    return <Layout showNav={false}><DashboardHeader /><div className="container mx-auto px-4 py-12 text-center text-muted-foreground">Loading...</div></Layout>;
  }

  return (
    <Layout showNav={false}>
      <DashboardHeader />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold font-heading mb-6 text-foreground">Business Dashboard</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Create Donation */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Donation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDonation} className="space-y-4">
                <div className="space-y-2">
                  <Label>Item Name</Label>
                  <Input value={itemName} onChange={(e) => setItemName(e.target.value)} required placeholder="e.g. Chicken Sandwich" />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
                </div>
                <div className="space-y-2">
                  <Label>Redemption End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Agency</Label>
                  <Select value={agencyId} onValueChange={setAgencyId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fair">Distribute Fairly (All Agencies)</SelectItem>
                      {agencies.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full rounded-xl" disabled={creating}>
                  {creating ? "Creating..." : "Create & Distribute"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Scan QR */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Scan QR Code
              </CardTitle>
              <CardDescription>Enter or scan the HHA's QR token to validate redemption</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>QR Token</Label>
                <Input
                  value={scanToken}
                  onChange={(e) => setScanToken(e.target.value)}
                  placeholder="Paste or scan QR token"
                />
              </div>
              <Button onClick={handleScanQR} disabled={scanning || !scanToken.trim()} className="w-full rounded-xl">
                {scanning ? "Validating..." : "Validate & Redeem"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Active Donations */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Package className="h-5 w-5" />
              Your Donation Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Donations sent to Bronx Home Care Services</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Claimed</TableHead>
                    <TableHead>Redeemed</TableHead>
                    <TableHead>End Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.item_name}</TableCell>
                      <TableCell>{c.quantity}</TableCell>
                      <TableCell>{campaignClaims[c.id]?.claimed || 0}</TableCell>
                      <TableCell>{campaignClaims[c.id]?.redeemed || 0}</TableCell>
                      <TableCell>{new Date(c.redemption_end_date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default BusinessDashboard;
