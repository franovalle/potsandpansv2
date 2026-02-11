
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('hha', 'business', 'admin');

-- Agencies table
CREATE TABLE public.agencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rosters table
CREATE TABLE public.rosters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  contact_email_or_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (security-critical, separate from profiles)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- HHA profiles
CREATE TABLE public.hha_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  roster_id UUID NOT NULL REFERENCES public.rosters(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Business profiles
CREATE TABLE public.business_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT NOT NULL,
  business_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Donation campaigns
CREATE TABLE public.donation_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL DEFAULT 'Unknown Business',
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  redemption_end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Donation claims
CREATE TABLE public.donation_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.donation_campaigns(id) ON DELETE CASCADE,
  hha_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',
  claimed_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '3 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hha_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_claims ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Agencies: readable by all authenticated, writable by admin
CREATE POLICY "Agencies readable by authenticated" ON public.agencies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Agencies writable by admin" ON public.agencies
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Rosters: readable by all authenticated (needed for HHA signup verification), writable by admin
CREATE POLICY "Rosters readable by authenticated" ON public.rosters
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Rosters readable by anon for signup" ON public.rosters
  FOR SELECT TO anon USING (true);
CREATE POLICY "Agencies readable by anon for signup" ON public.agencies
  FOR SELECT TO anon USING (true);
CREATE POLICY "Rosters writable by admin" ON public.rosters
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User roles: users can read own role, admin can read all
CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- HHA profiles: users see own, admin sees all
CREATE POLICY "HHA see own profile" ON public.hha_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "HHA insert own profile" ON public.hha_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Business profiles: users see own, admin sees all
CREATE POLICY "Business see own profile" ON public.business_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Business insert own profile" ON public.business_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Donation campaigns: businesses see own, admin sees all, HHAs can see all (to check available)
CREATE POLICY "Campaigns viewable by authenticated" ON public.donation_campaigns
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Campaigns created by business" ON public.donation_campaigns
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'business'));
CREATE POLICY "Admin manage campaigns" ON public.donation_campaigns
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Donation claims: HHAs see own, businesses see claims for own campaigns, admin sees all
CREATE POLICY "HHA see own claims" ON public.donation_claims
  FOR SELECT TO authenticated USING (hha_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Business see campaign claims" ON public.donation_claims
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.donation_campaigns dc
      WHERE dc.id = campaign_id AND dc.business_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "HHA can update own claims" ON public.donation_claims
  FOR UPDATE TO authenticated USING (hha_id = auth.uid());

-- Indexes
CREATE INDEX idx_rosters_agency ON public.rosters(agency_id);
CREATE INDEX idx_rosters_name_agency ON public.rosters(full_name, agency_id);
CREATE INDEX idx_donation_claims_hha ON public.donation_claims(hha_id);
CREATE INDEX idx_donation_claims_campaign ON public.donation_claims(campaign_id);
CREATE INDEX idx_donation_claims_token ON public.donation_claims(token);
CREATE INDEX idx_donation_claims_status ON public.donation_claims(status);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- Seed demo data: agencies
INSERT INTO public.agencies (id, name) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Bronx Home Care Services'),
  ('a1000000-0000-0000-0000-000000000002', 'Community Health Partners'),
  ('a1000000-0000-0000-0000-000000000003', 'Caring Hands Agency');

-- Seed demo data: rosters
INSERT INTO public.rosters (agency_id, full_name, contact_email_or_phone) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Maria Rodriguez', 'maria.rodriguez@bronxhomecare.com'),
  ('a1000000-0000-0000-0000-000000000001', 'James Wilson', 'james.wilson@bronxhomecare.com'),
  ('a1000000-0000-0000-0000-000000000001', 'Carmen Santos', 'carmen.santos@bronxhomecare.com'),
  ('a1000000-0000-0000-0000-000000000001', 'David Chen', 'david.chen@bronxhomecare.com'),
  ('a1000000-0000-0000-0000-000000000001', 'Lisa Johnson', 'lisa.johnson@bronxhomecare.com'),
  ('a1000000-0000-0000-0000-000000000002', 'Angela Martinez', 'angela.martinez@communityhp.com'),
  ('a1000000-0000-0000-0000-000000000002', 'Michael Brown', 'michael.brown@communityhp.com'),
  ('a1000000-0000-0000-0000-000000000002', 'Sofia Ramirez', 'sofia.ramirez@communityhp.com'),
  ('a1000000-0000-0000-0000-000000000002', 'Robert Taylor', 'robert.taylor@communityhp.com'),
  ('a1000000-0000-0000-0000-000000000002', 'Nina Patel', 'nina.patel@communityhp.com'),
  ('a1000000-0000-0000-0000-000000000003', 'Jennifer Garcia', 'jennifer.garcia@caringhands.com'),
  ('a1000000-0000-0000-0000-000000000003', 'Kevin Lee', 'kevin.lee@caringhands.com'),
  ('a1000000-0000-0000-0000-000000000003', 'Diana Flores', 'diana.flores@caringhands.com'),
  ('a1000000-0000-0000-0000-000000000003', 'Marcus Jackson', 'marcus.jackson@caringhands.com'),
  ('a1000000-0000-0000-0000-000000000003', 'Rebecca Kim', 'rebecca.kim@caringhands.com');

-- Seed demo data: donation campaigns (no business_id since these are fictional)
INSERT INTO public.donation_campaigns (id, business_name, item_name, quantity, agency_id, redemption_end_date) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Bronx Deli', 'Chicken Sandwich', 10, NULL, '2026-03-15'),
  ('d1000000-0000-0000-0000-000000000002', 'Corner Cafe', 'Coffee & Pastry Voucher', 15, 'a1000000-0000-0000-0000-000000000001', '2026-03-20'),
  ('d1000000-0000-0000-0000-000000000003', 'Bronx Boutique', '$25 Clothing Voucher', 8, NULL, '2026-04-01');
