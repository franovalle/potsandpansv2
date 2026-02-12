import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const DashboardHeader = () => {
  const { signOut, role } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Pots & Pans" className="h-10 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-medium px-3 py-1 rounded-full bg-secondary">
            {role === "hha" ? "HHA" : role === "admin" ? "Admin" : role === "business" ? "Business" : role}
          </span>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/"); }} className="gap-2">
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
