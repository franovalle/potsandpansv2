# Architecture

## System Design

```
┌─────────────────────────────────────────────────┐
│              User Browser (React SPA)           │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ HHA Dash  │  │ Biz Dash │  │ Admin Dash   │ │
│  └─────┬─────┘  └────┬─────┘  └──────┬───────┘ │
└────────┼──────────────┼───────────────┼─────────┘
         │              │               │
         v              v               v
┌─────────────────────────────────────────────────┐
│              Supabase Auth                      │
│  email/password login ──> user_roles table      │
│  role: hha | business | admin                   │
│  ──> role-based routing to dashboard            │
└────────────────────┬────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────┐
│         Supabase Postgres (RLS-protected)       │
│                                                 │
│  agencies            rosters                    │
│  hha_profiles        business_profiles          │
│  donation_campaigns  donation_claims            │
│  user_roles                                     │
└────────────────────┬────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────┐
│        Supabase Edge Functions (Deno)           │
│                                                 │
│  seed-admin          Bootstrap admin account    │
│  signup-hha          Roster-verified HHA reg    │
│  signup-business     Biz reg + auto-campaign    │
│  distribute-donations Fair distribution algo    │
│  claim-donation      Claim + token generation   │
│  validate-qr         Redeem via QR token        │
│  reset-hha-demo      Demo state reset           │
└────────────────────┬────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────┐
│        External: QR Server API                  │
│  api.qrserver.com/v1/create-qr-code            │
│  Generates scannable QR code images from tokens │
└─────────────────────────────────────────────────┘
```

## Planner / Executor

Edge functions act as the **executor layer** — each handles one discrete action:

| Function | Responsibility |
|----------|---------------|
| `seed-admin` | One-time admin account bootstrap |
| `signup-hha` | Verify against roster → create auth user → assign role → auto-assign donations |
| `signup-business` | Create auth user → assign role → (if "Bronx Deli") auto-create campaign + distribute |
| `distribute-donations` | Split quantity across agencies, prioritize by claim history |
| `claim-donation` | Generate unique token, set claim timestamp and expiry |
| `validate-qr` | Verify token, mark as redeemed |
| `reset-hha-demo` | Delete claims for user, recreate fresh pending claim |

The **planner logic** lives in `signup-business`: when a business named "Bronx Deli" registers, it orchestrates campaign creation and fair distribution in sequence — acting as a mini-workflow engine.

## Memory Structure

Supabase Postgres with **7 tables** serves as persistent memory:

```
agencies ──< rosters ──< hha_profiles
                              │
donation_campaigns ──< donation_claims
       │                      │
  business_profiles      (lifecycle tracking)
       │
  user_roles
```

The `donation_claims` table tracks the full lifecycle:
- **pending** → donation assigned, waiting for HHA to claim
- **claimed** → HHA claimed, token generated, QR code active
- **redeemed** → business validated QR, donation fulfilled
- **expired** → claim window (3 days) or redemption window (7 days) elapsed

Key fields: `token`, `claimed_at`, `redeemed_at`, `expires_at`

## Tool Integrations

| Tool | Purpose |
|------|---------|
| **Supabase Auth** | Email/password authentication for all three roles |
| **Supabase RLS** | Row-level security policies protect all tables |
| **QR Server API** | Generates scannable QR code images from claim tokens |
| **has_role() function** | SQL function used in RLS policies for role-based access |

## Logging and Observability

- **Edge function logs**: Available via Supabase dashboard for server-side debugging
- **Client-side toasts**: `sonner` toast notifications surface errors and confirmations to users
- **Resilient fallback pattern**: Every network call tries the Supabase JS client first (with 3–8 second timeout), then falls back to a direct REST `fetch` call — preventing client hangs
- **useRef guards**: Prevent duplicate edge function calls within a single React session
