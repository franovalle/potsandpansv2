

# Fix HHA Dashboard Loading + Speed Up Login

## Problem 1: HHA Dashboard Stuck on "Loading"
The dashboard calls `supabase.from("donation_claims").select(...)` which uses the same Supabase client that hangs. There's no timeout or REST fallback, so `loadingData` never becomes `false`.

## Problem 2: Login Timeout Too Long
The login page waits 8 seconds before trying the REST fallback. This feels unresponsive.

## Fixes

### File: `src/pages/HHADashboard.tsx`
- Add a `Promise.race` timeout (5s) around the Supabase query in `fetchClaims`
- Add a REST API fallback that fetches claims directly via `fetch()` using the user's access token
- If both fail, set `loadingData` to `false` anyway so the user sees the "no donations" state instead of infinite loading

### File: `src/pages/Login.tsx`
- Reduce the login timeout from 8 seconds to 4 seconds so the REST fallback kicks in faster

### File: `src/contexts/AuthContext.tsx`
- No changes needed -- signOut and fetchRole are already fixed

## Technical Details

### HHADashboard.tsx - fetchClaims with timeout + fallback

```typescript
const fetchClaims = useCallback(async () => {
  if (!user) return;
  setLoadingData(true);

  let claims: any[] | null = null;

  // Try Supabase client with timeout
  try {
    const result = await Promise.race([
      supabase
        .from("donation_claims")
        .select("*, donation_campaigns(*)")
        .eq("hha_id", user.id)
        .order("created_at", { ascending: false }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]);
    claims = result.data;
  } catch {
    // Fallback: direct REST
    try {
      const session = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) => setTimeout(() => reject(), 2000)),
      ]);
      const token = session?.data?.session?.access_token;
      if (token) {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/donation_claims?select=*,donation_campaigns(*)&hha_id=eq.${user.id}&order=created_at.desc`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (res.ok) claims = await res.json();
      }
    } catch {
      // both failed
    }
  }

  if (claims) {
    const typed = claims as unknown as ClaimWithCampaign[];
    setPendingClaim(typed.find((c) => c.status === "pending") || null);
    const active = typed.find((c) => c.status === "claimed");
    setActiveClaim(active || null);
    if (active) setQrToken(active.token);
    setHistory(typed.filter((c) => c.status === "redeemed" || c.status === "expired"));
  }
  setLoadingData(false);
}, [user]);
```

The REST fallback needs the access token. Instead of calling `getSession()` (which can also hang), we'll store the token from AuthContext. Actually, since `getSession` can hang too, the safest approach is to read the token from localStorage directly as a fallback.

### Login.tsx - Reduce timeout
Change line 38 timeout from 8000ms to 4000ms.

### Files to modify
| File | Change |
|------|--------|
| `src/pages/HHADashboard.tsx` | Add timeout + REST fallback to `fetchClaims`, add SUPABASE constants |
| `src/pages/Login.tsx` | Reduce login timeout from 8s to 4s |

