import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Layout from "@/components/Layout";
import DashboardHeader from "@/components/DashboardHeader";
import { toast } from "@/hooks/use-toast";
import { Users, Building2, Gift, BarChart3, Plus, Trash2 } from "lucide-react";

const AdminDashboard = () => {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [agencies, setAgencies] = useState<any[]>([]);
  const [rosters, setRosters] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState({ agencies: 0, hhas: 0, donations: 0, claimRate: 0, redeemRate: 0 });

  // Add agency form
  const [newAgencyName, setNewAgencyName] = useState("");
  // Add employee form
  const [empName, setEmpName] = useState("");
  const [empContact, setEmpContact] = useState("");
  const [empAgency, setEmpAgency] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || role !== "admin")) {
      navigate("/login", { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (!user || role !== "admin") return;
    fetchAll();
  }, [user, role]);

  const fetchAll = async () => {
    // Agencies
    const { data: agencyData } = await supabase.from("agencies").select("*").order("name");
    setAgencies(agencyData || []);

    // Rosters
    const { data: rosterData } = await supabase.from("rosters").select("*, agencies(name)").order("full_name");
    setRosters(rosterData || []);

    // Campaigns
    const { data: campaignData } = await supabase.from("donation_campaigns").select("*, agencies(name)").order("created_at", { ascending: false });
    setCampaigns(campaignData || []);

    // Stats
    const { data: hhaData } = await supabase.from("hha_profiles").select("id");
    const { data: claimsData } = await supabase.from("donation_claims").select("status");

    const totalClaims = claimsData?.length || 0;
    const claimed = claimsData?.filter((c) => c.status === "claimed" || c.status === "redeemed").length || 0;
    const redeemed = claimsData?.filter((c) => c.status === "redeemed").length || 0;

    setStats({
      agencies: agencyData?.length || 0,
      hhas: hhaData?.length || 0,
      donations: campaignData?.length || 0,
      claimRate: totalClaims > 0 ? Math.round((claimed / totalClaims) * 100) : 0,
      redeemRate: totalClaims > 0 ? Math.round((redeemed / totalClaims) * 100) : 0,
    });
  };

  const addAgency = async () => {
    if (!newAgencyName.trim()) return;
    const { error } = await supabase.from("agencies").insert({ name: newAgencyName.trim() });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Agency Added" });
      setNewAgencyName("");
      fetchAll();
    }
  };

  const addEmployee = async () => {
    if (!empName.trim() || !empAgency) return;
    const { error } = await supabase.from("rosters").insert({
      full_name: empName.trim(),
      contact_email_or_phone: empContact.trim() || null,
      agency_id: empAgency,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Employee Added" });
      setEmpName("");
      setEmpContact("");
      setEmpAgency("");
      fetchAll();
    }
  };

  const removeEmployee = async (id: string) => {
    const { error } = await supabase.from("rosters").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchAll();
    }
  };

  if (authLoading) {
    return <Layout showNav={false}><DashboardHeader /><div className="container mx-auto px-4 py-12 text-center text-muted-foreground">Loading...</div></Layout>;
  }

  return (
    <Layout showNav={false}>
      <DashboardHeader />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold font-heading mb-6 text-foreground">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Agencies", value: stats.agencies, icon: Building2 },
            { label: "Registered HHAs", value: stats.hhas, icon: Users },
            { label: "Donations", value: stats.donations, icon: Gift },
            { label: "Claim Rate", value: `${stats.claimRate}%`, icon: BarChart3 },
            { label: "Redeem Rate", value: `${stats.redeemRate}%`, icon: BarChart3 },
          ].map((s) => (
            <Card key={s.label} className="rounded-2xl">
              <CardContent className="py-4 text-center">
                <s.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Manage Agencies */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="font-heading">Manage Agencies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={newAgencyName} onChange={(e) => setNewAgencyName(e.target.value)} placeholder="Agency name" />
                <Button onClick={addAgency} size="sm" className="rounded-xl"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2">
                {agencies.map((a) => {
                  const count = rosters.filter((r) => r.agency_id === a.id).length;
                  return (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                      <span className="font-medium text-foreground">{a.name}</span>
                      <span className="text-sm text-muted-foreground">{count} employees</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Add Employee */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="font-heading">Add Employee to Roster</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={empName} onChange={(e) => setEmpName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email or Phone</Label>
                <Input value={empContact} onChange={(e) => setEmpContact(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Agency</Label>
                <Select value={empAgency} onValueChange={setEmpAgency}>
                  <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
                  <SelectContent>
                    {agencies.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addEmployee} className="w-full rounded-xl">Add Employee</Button>
            </CardContent>
          </Card>
        </div>

        {/* Roster Table */}
        <Card className="rounded-2xl mb-8">
          <CardHeader>
            <CardTitle className="font-heading">Roster</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Agency</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rosters.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell>{r.contact_email_or_phone}</TableCell>
                    <TableCell>{(r as any).agencies?.name}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => removeEmployee(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* All Donations */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-heading">All Donation Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Agency</TableHead>
                  <TableHead>End Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.business_name}</TableCell>
                    <TableCell className="font-medium">{c.item_name}</TableCell>
                    <TableCell>{c.quantity}</TableCell>
                    <TableCell>{(c as any).agencies?.name || "All (Fair)"}</TableCell>
                    <TableCell>{new Date(c.redemption_end_date).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
