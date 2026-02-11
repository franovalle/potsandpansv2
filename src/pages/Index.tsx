import { Link } from "react-router-dom";
import { Heart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";

const Index = () => {
  return (
    <Layout>
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold font-heading text-foreground mb-6 leading-tight">
              Connecting businesses with Bronx healthcare heroes
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-2 font-body">
              Connecting caring businesses with the heroes who serve our community.
            </p>
            <p className="text-sm text-muted-foreground mb-10 font-heading font-semibold tracking-wide">
              #itDoesntHaveToEnd · Est. 2025
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="rounded-xl text-base px-8 py-6 gap-2">
                <Link to="/signup/hha">
                  <Heart className="h-5 w-5" />
                  I'm a Home Health Aide
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-xl text-base px-8 py-6 gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Link to="/signup/business">
                  <Users className="h-5 w-5" />
                  I'm a Business
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative background */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 -right-20 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-1/4 -left-20 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold font-heading text-center mb-12 text-foreground">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                title: "Businesses Donate",
                desc: "Local Bronx businesses create donation campaigns for goods and services.",
              },
              {
                step: "2",
                title: "Fair Distribution",
                desc: "Donations are fairly distributed to verified Home Health Aides across agencies.",
              },
              {
                step: "3",
                title: "Easy Redemption",
                desc: "HHAs claim donations and redeem them with a simple QR code scan.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="text-center p-6 rounded-2xl bg-background border border-border"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold font-heading mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold font-heading mb-2 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground font-body">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border">
        <p className="font-heading font-semibold">Pots & Pans © 2025</p>
        <p>#itDoesntHaveToEnd</p>
      </footer>
    </Layout>
  );
};

export default Index;
