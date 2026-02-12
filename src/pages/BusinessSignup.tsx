import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { toast } from "@/hooks/use-toast";

const SUPABASE_URL = "https://dqvjkwrrxbtyziliyrkh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxdmprd3JyeGJ0eXppbGl5cmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDgxNTIsImV4cCI6MjA4NjQyNDE1Mn0.D8s6cg-qS4jOI1LI71mQbzqf8zLwQGmBu8ssaEjFAYQ";

const BusinessSignup = () => {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const body = { business_name: businessName, business_type: businessType, email, password };

    try {
      // Try supabase client with a 8s timeout
      const result = await Promise.race([
        supabase.functions.invoke("signup-business", { body }),
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
        const response = await fetch(`${SUPABASE_URL}/functions/v1/signup-business`, {
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
            <CardTitle className="text-2xl font-heading">Business Signup</CardTitle>
            <CardDescription>Register your business to start donating</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type</Label>
                <Input id="businessType" value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="e.g. Restaurant, Retail" />
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
                {loading ? "Creating Account..." : "Sign Up"}
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

export default BusinessSignup;
