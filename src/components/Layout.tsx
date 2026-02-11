import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

const Layout = ({ children, showNav = true }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {showNav && (
        <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="Pots & Pans" className="h-10 w-auto" />
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Log In
              </Link>
            </nav>
          </div>
        </header>
      )}
      <main>{children}</main>
    </div>
  );
};

export default Layout;
