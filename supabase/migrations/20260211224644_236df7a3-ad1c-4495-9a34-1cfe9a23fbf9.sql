
-- Create admin user role insert policy (needed for the edge function to insert roles)
CREATE POLICY "Service role can manage roles" ON public.user_roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow service role full access to hha_profiles for signup
CREATE POLICY "Service role can manage hha_profiles" ON public.hha_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow service role full access to business_profiles for signup  
CREATE POLICY "Service role can manage business_profiles" ON public.business_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow service role full access to donation_claims for distribution
CREATE POLICY "Service role can manage donation_claims" ON public.donation_claims
  FOR ALL TO service_role USING (true) WITH CHECK (true);
