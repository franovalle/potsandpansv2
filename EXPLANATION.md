# Explanation

## Reasoning Process

The architecture is driven by **role-based access control**. Three roles — HHA, Business, and Admin — each have:

- A dedicated signup flow (or seeded account for Admin)
- A role-specific dashboard with tailored UI
- Permitted actions enforced by both RLS policies and edge function logic

Every design decision flows from this separation:
- **Why edge functions instead of client-side logic?** Server-side functions use the service role key to bypass RLS for admin-level operations (creating users, distributing donations) while the client never sees privileged credentials.
- **Why roster verification?** HHAs must match an admin-uploaded roster entry before registration. This ensures only verified home health aides receive donations.
- **Why auto-distribution?** When a business creates a campaign, donations are immediately and fairly distributed to eligible HHAs — no manual assignment needed.

## Memory Usage

The database serves as **persistent memory** across sessions:

| Memory Pattern | Implementation |
|---------------|----------------|
| Identity | `auth.users` + `user_roles` table maps users to roles |
| Profile data | `hha_profiles` and `business_profiles` store role-specific info |
| Donation lifecycle | `donation_claims.status` tracks: pending → claimed → redeemed/expired |
| Claim tokens | `donation_claims.token` stores the current QR token for validation |
| Timestamps | `claimed_at`, `redeemed_at`, `expires_at` enforce time windows |

**Session-level memory**: React `useRef` flags prevent duplicate edge function calls (e.g., the demo reset runs exactly once per login session).

**Memory reset**: The `reset-hha-demo` edge function provides a controlled "memory wipe" — deleting all claims for a user and creating a fresh pending donation. This enables repeatable demos.

## Planning Style

The system uses **sequential orchestration** rather than parallel execution:

1. Business signs up → auth user created → role assigned → profile stored
2. If business is "Bronx Deli" → campaign auto-created → distribution triggered
3. Distribution algorithm runs:
   - Split quantity evenly across target agencies
   - Within each agency, sort HHAs by priority:
     - **First**: HHAs who have never received any donation
     - **Then**: HHAs sorted by longest time since last donation (oldest first)
   - Assign claims to top-priority HHAs up to the available quantity

This ensures **equitable distribution** — no single HHA accumulates donations while others have none.

## Tool Integration

### Supabase Auth
Email/password authentication for all roles. Admin account is bootstrapped via the `seed-admin` edge function. Users are created server-side with `auth.admin.createUser()` to enable immediate email confirmation (no verification email in demo mode).

### Edge Functions
Seven Deno-based serverless functions handle all privileged operations. Each function:
- Validates input parameters
- Uses the service role key (never exposed to the client)
- Returns JSON responses with appropriate HTTP status codes
- Includes CORS headers for browser access

### QR Server API
After an HHA claims a donation, the dashboard generates a rotating QR code:
```
https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={token}
```
The token rotates every 60 seconds with a visible countdown timer. Businesses paste the token to validate redemption.

### Resilient Fallback Pattern
Every client-side network call follows this pattern:
1. Try the Supabase JS client with a timeout (3–8 seconds)
2. If it hangs or fails, fall back to a direct REST `fetch` call
3. If both fail, show an error toast to the user

This prevents the UI from freezing when the Supabase client occasionally hangs.

## Known Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|------------|
| QR codes depend on api.qrserver.com | No offline QR generation | Could integrate a client-side QR library |
| Demo reset deletes ALL claims for user | Not scoped to demo campaigns only | Acceptable for demo; production would scope by campaign |
| No camera-based QR scanning | Business must manually paste token | Could add a browser-based QR scanner |
| No email notifications | HHAs must check dashboard for new donations | Could integrate an email service |
| Single admin account | Bootstrapped via edge function, no multi-admin | Could add admin invitation flow |
| No pagination | Dashboard queries use Supabase's 1000-row default | Sufficient for demo scale; would add pagination for production |
