

# Pots & Pans Platform -- Adjustments to Match Spec

## What's Already Done (No Changes Needed)
The platform is largely built and functional:
- Design system (burgundy/cream, Quicksand/Inter typography)
- Landing page with correct headline
- All authentication flows (Login, HHA Signup, Business Signup)
- HHA Dashboard with rotating QR token and claim flow
- Business Dashboard with donation creation and QR validation
- Admin Dashboard with stats, agency/roster management
- All edge functions (signup-hha, signup-business, claim-donation, validate-qr, distribute-donations)
- Database schema with full RLS policies
- Admin account (admin@potsandpans.com / Admin123!)

## Changes Required

### 1. Clean Up Demo Data
The database currently has 3 agencies, 15 roster entries, and 3 pre-seeded donation campaigns. The spec calls for:
- **1 agency**: Bronx Home Care Services (keep, delete the other 2)
- **1 roster entry**: Maria Rodriguez (keep, delete the other 14)
- **0 donation campaigns**: Remove all pre-seeded campaigns (campaigns should only exist after Bronx Deli signs up)

Run a SQL migration to delete extra agencies, roster entries, and campaigns.

### 2. Auto-Create Campaign on "Bronx Deli" Business Signup
Update `supabase/functions/signup-business/index.ts` to check if the business name is "Bronx Deli" (case-insensitive). If so, after creating the account and profile, automatically:
- Create a donation campaign: item "Chicken Sandwich", quantity 1, agency "Bronx Home Care Services", redemption end date 30 days out
- Run the distribution algorithm to assign it to eligible HHAs

### 3. Auto-Assign Donations on HHA Signup
Update `supabase/functions/signup-hha/index.ts` to, after creating the HHA account and profile, check for any active donation campaigns with available slots and auto-assign using the fair distribution logic (call the distribute-donations function or inline the logic).

### 4. No Other Changes
All UI pages, design system, edge functions, and RLS policies remain as-is.

---

## Technical Details

### Migration SQL
```sql
-- Delete extra campaigns (all pre-seeded ones)
DELETE FROM donation_campaigns WHERE id IN (
  'd1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000002',
  'd1000000-0000-0000-0000-000000000003'
);

-- Delete extra roster entries (keep only Maria Rodriguez)
DELETE FROM rosters WHERE full_name != 'Maria Rodriguez';

-- Delete extra agencies (keep only Bronx Home Care Services)
DELETE FROM agencies WHERE name != 'Bronx Home Care Services';
```

### signup-business/index.ts changes
After inserting role and business profile, add:
```typescript
// If business is "Bronx Deli", auto-create demo campaign
if (business_name.trim().toLowerCase() === "bronx deli") {
  const { data: agency } = await supabaseAdmin
    .from("agencies")
    .select("id")
    .eq("name", "Bronx Home Care Services")
    .maybeSingle();

  if (agency) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const { data: campaign } = await supabaseAdmin
      .from("donation_campaigns")
      .insert({
        business_id: userId,
        business_name: business_name.trim(),
        item_name: "Chicken Sandwich",
        quantity: 1,
        agency_id: agency.id,
        redemption_end_date: endDate.toISOString().split("T")[0],
      })
      .select()
      .single();

    // Distribute to eligible HHAs
    if (campaign) {
      // inline distribution logic for this single campaign
    }
  }
}
```

### signup-hha/index.ts changes
After inserting HHA profile, add logic to find pending campaigns that have undistributed quantity for the HHA's agency, and create a `donation_claims` entry if eligible.

