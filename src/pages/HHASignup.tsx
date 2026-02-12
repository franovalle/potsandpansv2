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

const SUPABASE_URL = "https://dqvjkwrrxbtyziliyrkh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxdmprd3JyeGJ0eXppbGl5cmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDgxNTIsImV4cCI6MjA4NjQyNDE1Mn0.D8s6cg-qS4jOI1LI71mQbzqf8zLwQGmBu8ssaEjFAYQ";

const HHASignup = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAgencies, setLoadingAgencies] = useState(true);
  const [agencyError, setAgencyError] = useState(false);

  const fetchAgencies = async () => {
    setLoadingAgencies(true);
    setAgencyError(false);

    try {
      // Try supabase client with 5s timeout
      const result = await Promise.race([
        supabase.from("agencies").select("id, name"),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);

      if (result.error) throw result.error;
      if (result.data) {
        setAgencies(result.data);
        setLoadingAgencies(false);
        return;
      }
    } catch {
      // Fallback: direct REST
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/agencies?select=id,name`, {
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setAgencies(data);
          setLoadingAgencies(false);
          return;
        }
      } catch {
        // both failed
      }
    }

    setAgencyError(true);
    setLoadingAgencies(false);
  };

  useEffect(() => {
    fetchAgencies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const body = { full_name: fullName, agency_id: agencyId, email, password };

    try {
      const result = await Promise.race([
        supabase.functions.invoke("signup-hha", { body }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
      ]);

      if (result.error || result.data?.error) {
        toast({ title: "Signup Failed", description: result.data?.error || "An error occurred", variant: "destructive" });
      } else {
        toast({ title: "Account Created!", description: "You can now log in." });
        navigate("/login");
      }
    } catch {
      // Fallback: direct fetch
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/signup-hha`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok || data.error) {
          toast({ title: "Signup Failed", description: data.error || "An error occurred", variant: "destructive" });
        } else {
          toast({ title: "Account Created!", description: "You can now log in." });
          navigate("/login");
        }
      } catch {
        toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
      }
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
                {agencyError ? (
                  <div className="text-sm text-destructive">
                    Failed to load agencies.{" "}
                    <button type="button" onClick={fetchAgencies} className="underline text-primary">
                      Retry
                    </button>
                  </div>
                ) : (
                  <Select value={agencyId} onValueChange={setAgencyId} required disabled={loadingAgencies}>
                    <SelectTrigger><SelectValue placeholder={loadingAgencies ? "Loading agencies..." : "Select your agency"} /></SelectTrigger>
                    <SelectContent>
                      {agencies.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
