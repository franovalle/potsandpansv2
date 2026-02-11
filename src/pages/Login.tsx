import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";

const Login = () => {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user && role) {
      if (role === "hha") navigate("/dashboard/hha", { replace: true });
      else if (role === "business") navigate("/dashboard/business", { replace: true });
      else if (role === "admin") navigate("/dashboard/admin", { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card className="rounded-2xl border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-heading">Welcome Back</CardTitle>
            <CardDescription>Log in to your Pots & Pans account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                {loading ? "Logging in..." : "Log In"}
              </Button>
            </form>
            <div className="text-center text-sm text-muted-foreground mt-4 space-y-1">
              <p>
                Home Health Aide? <Link to="/signup/hha" className="text-primary hover:underline">Sign up here</Link>
              </p>
              <p>
                Business? <Link to="/signup/business" className="text-primary hover:underline">Sign up here</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Login;
