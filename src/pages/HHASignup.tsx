import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";
import { toast } from "@/hooks/use-toast";

const HHASignup = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("agencies").select("id, name").then(({ data }) => {
      if (data) setAgencies(data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await supabase.functions.invoke("signup-hha", {
        body: { full_name: fullName, agency_id: agencyId, email, password },
      });

      if (res.error || res.data?.error) {
        toast({ title: "Signup Failed", description: res.data?.error || "An error occurred", variant: "destructive" });
      } else {
        toast({ title: "Account Created!", description: "You can now log in." });
        navigate("/login");
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card className="rounded-2xl border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-heading">Home Health Aide Signup</CardTitle>
            <CardDescription>Verify your identity against your agency roster</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name (as on roster)</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="e.g. Maria Rodriguez" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agency">Agency</Label>
                <Select value={agencyId} onValueChange={setAgencyId} required>
                  <SelectTrigger><SelectValue placeholder="Select your agency" /></SelectTrigger>
                  <SelectContent>
                    {agencies.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                {loading ? "Verifying..." : "Sign Up"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default HHASignup;
