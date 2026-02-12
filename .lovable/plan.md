

# Fix Navigation, Add Demo Reset, QR Code Image, and Business Message

## 1. Navigation Fix -- Remove Duplicate Headers

All three dashboard pages (HHA, Business, Admin) currently render both `<Layout>` (which shows a header with "Log In" link) AND `<DashboardHeader>` (which shows logo + "Log Out"). This creates duplicate logos and shows "Log In" to logged-in users.

**Fix**: Pass `showNav={false}` to `<Layout>` in all dashboard pages so only `DashboardHeader` (with logo + Log Out) is visible.

**Files**:
- `src/pages/HHADashboard.tsx` -- change `<Layout>` to `<Layout showNav={false}>` (3 occurrences: loading state and main return)
- `src/pages/BusinessDashboard.tsx` -- change `<Layout>` to `<Layout showNav={false}>` (2 occurrences)
- `src/pages/AdminDashboard.tsx` -- change `<Layout>` to `<Layout showNav={false}>` (2 occurrences)

## 2. HHA Demo Reset -- Fresh Donation Every Login

Create a new edge function `reset-hha-demo` that:
- Accepts the HHA user's ID
- Deletes all existing `donation_claims` for that user
- Finds the active "Chicken Sandwich" campaign from "Bronx Deli"
- Creates a fresh `pending` claim with a new token and 3-day expiry

In `HHADashboard.tsx`, call this function once before fetching claims (using a `useRef` flag to prevent repeated calls within the same session).

**Files**:
- New: `supabase/functions/reset-hha-demo/index.ts`
- Modified: `src/pages/HHADashboard.tsx` -- add reset call before `fetchClaims`

## 3. QR Code -- Real Scannable Image

Replace the text-based token display (lines 172-176 of HHADashboard.tsx) with an actual QR code image using the free QR Server API:

```
https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={token}
```

The image will update automatically every 60 seconds when the token rotates.

**File**: `src/pages/HHADashboard.tsx`

## 4. Business Dashboard Empty State

Change line 240 of `BusinessDashboard.tsx` from "No donation campaigns yet" to "Donations sent to Bronx Home Care Services".

**File**: `src/pages/BusinessDashboard.tsx`

## Summary

| File | Change |
|------|--------|
| `src/pages/HHADashboard.tsx` | `showNav={false}`, demo reset call, real QR code image |
| `src/pages/BusinessDashboard.tsx` | `showNav={false}`, updated empty state message |
| `src/pages/AdminDashboard.tsx` | `showNav={false}` |
| `supabase/functions/reset-hha-demo/index.ts` | New edge function for demo reset |

No styling files are touched -- your design (cream background, burgundy buttons, Quicksand/Inter fonts) stays exactly as-is.

