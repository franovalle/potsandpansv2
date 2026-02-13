# Create GitHub Documentation Files

## Overview

Create four documentation files (README.md, ARCHITECTURE.md, EXPLANATION.md, DEMO.md) in the root of the repo that describe Pots and Pans -- a platform connecting Bronx businesses with Home Health Aides through a donation and QR-code redemption system.

---

## 1. README.md (replace existing)

Will include:

**Problem Statement**: Home Health Aides in the Bronx are undervalued and under-supported. Local businesses want to help but lack a streamlined way to donate goods directly to verified HHAs.

**Solution**: Pots and Pans is a web platform where businesses create donation campaigns, an admin manages agency rosters, and HHAs claim and redeem donations via scannable QR codes -- ensuring fair, verifiable distribution.

**Tech Stack and Dependencies**:

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix primitives)
- Backend: Supabase (Postgres + Auth + Edge Functions via Deno)
- Key libraries: React Router, TanStack Query, Recharts, date-fns
- QR generation: External API (api.qrserver.com)

**Setup Instructions**:

- Clone, `npm install`, `npm run dev`
- Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
- Database setup via Supabase migrations
- Edge function deployment
  &nbsp;

---

## 2. ARCHITECTURE.md

Will include an ASCII system diagram and descriptions of:

**System Design Diagram** (ASCII art):

```
User Browser (React SPA)
    |
    v
Supabase Auth --> user_roles table --> role-based routing
    |
    v
Supabase Postgres (RLS-protected tables)
  - agencies, rosters, hha_profiles, business_profiles
  - donation_campaigns, donation_claims, user_roles
    |
    v
Supabase Edge Functions (Deno)
  - seed-admin: bootstrap admin account
  - signup-hha: roster-verified HHA registration
  - signup-business: business registration + auto-campaign for "Bronx Deli"
  - distribute-donations: fair distribution algorithm
  - claim-donation: claim with token generation
  - validate-qr: redeem via QR token
  - reset-hha-demo: demo state reset
    |
    v
External: QR Server API (image generation)
```

**Planner / Executor**: Edge functions act as the executor layer -- each handles one discrete action (signup, claim, validate, distribute). The planner logic lives in the business signup function which orchestrates campaign creation and distribution in sequence.

**Memory Structure**: Supabase Postgres with 7 tables. `donation_claims` tracks the full lifecycle (pending -> claimed -> redeemed/expired) with tokens, timestamps, and expiry windows.

**Tool Integrations**: QR Server API for scannable QR code images; Supabase Auth for authentication; RLS policies for row-level security.

**Logging and Observability**: Edge function logs via Supabase dashboard; client-side toast notifications for user feedback; resilient fallback pattern (Supabase client -> direct REST) with timeouts for reliability.

---

## 3. EXPLANATION.md

Will describe:

**Reasoning Process**: Role-based architecture (HHA, Business, Admin) drives all access control and UI routing. Each role has a dedicated signup flow, dashboard, and set of permitted actions.

**Memory Usage**: The database serves as persistent memory. `donation_claims` with status field tracks the full donation lifecycle. The `reset-hha-demo` function provides "memory reset" for repeatable demos. `useRef` flags prevent duplicate calls within a session.

**Planning Style**: Sequential orchestration -- business signup triggers campaign creation, which triggers fair distribution. The distribution algorithm prioritizes HHAs who have never received donations, then sorts by longest time since last donation.

**Tool Integration**: 

- Supabase Auth for identity
- Edge Functions for secure server-side logic (service role key never exposed to client)
- QR Server API for generating scannable images from tokens
- Resilient fallback pattern: every network call tries the Supabase JS client first (with timeout), then falls back to direct REST fetch

**Known Limitations**:

- QR code relies on external third-party API (api.qrserver.com) -- no offline fallback
- Demo reset deletes all claims for the user, not just demo ones
- No real camera-based QR scanning -- business must manually paste the token
- No email notifications for new donations
- Single admin account bootstrapped via edge function
- No pagination on dashboard queries (Supabase 1000-row default limit)

---

## 4. DEMO.md

&nbsp;

---

## Technical Details


| File              | Action           | Approximate Length |
| ----------------- | ---------------- | ------------------ |
| `README.md`       | Replace existing | ~80 lines          |
| `ARCHITECTURE.md` | New file         | ~100 lines         |
| `EXPLANATION.md`  | New file         | ~90 lines          |
| `DEMO.md`         | New file         | ~70 lines          |


No code changes -- only documentation files.