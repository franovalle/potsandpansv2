# Pots and Pans

**Connecting Bronx businesses with Home Health Aides through verified donation campaigns.**

## Problem

Home Health Aides (HHAs) in the Bronx are undervalued and under-supported. Local businesses want to help but lack a streamlined way to donate goods directly to verified HHAs.

## Solution

Pots and Pans is a web platform where businesses create donation campaigns, an admin manages agency rosters, and HHAs claim and redeem donations via scannable QR codes — ensuring fair, verifiable distribution.

### How It Works

1. **Admin** adds home care agencies and uploads employee rosters
2. **Businesses** sign up and create donation campaigns 
3. The system **fairly distributes** donations to eligible HHAs — prioritizing those who haven't received one yet
4. **HHAs** claim their donation, receive a rotating QR code, and present it at the business
5. **Businesses** scan/validate the QR code to complete redemption

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix primitives) |
| Backend | Supabase — Postgres, Auth, Edge Functions (Deno) |
| State Management | TanStack React Query |
| Routing | React Router v6 |
| Charts | Recharts |
| Date Utilities | date-fns |
| QR Generation | [QR Server API](https://goqr.me/api/) (api.qrserver.com) |

## Setup

```bash
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 2. Install dependencies
npm install

# 3. Configure environment variables
#    Create a .env file with:
#    VITE_SUPABASE_URL=<your-supabase-url>
#    VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>

# 4. Run database migrations
#    Apply all files in supabase/migrations/ via Supabase dashboard or CLI

# 5. Deploy edge functions
npx supabase functions deploy

# 6. Seed the admin account
curl -X POST <SUPABASE_URL>/functions/v1/seed-admin

# 7. Start the dev server
npm run dev
```

## Project Structure

```
src/
├── components/       # Shared UI components (Layout, DashboardHeader, shadcn/ui)
├── contexts/         # AuthContext for session management
├── hooks/            # Custom hooks (use-mobile, use-toast)
├── integrations/     # Supabase client and auto-generated types
├── pages/            # Route pages (Login, Signup, Dashboards)
supabase/
├── functions/        # Edge functions (signup, claim, validate, distribute, reset)
├── migrations/       # SQL migration files
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design, data flow, and component descriptions
- [EXPLANATION.md](./EXPLANATION.md) — Reasoning, memory usage, and known limitations
- [DEMO.md](./DEMO.md) — Step-by-step demo walkthrough

## Live

**Published at**: [https://potsandpans.lovable.app](https://potsandpans.lovable.app)
