

# Fix Login Hanging on "Logging in..."

## Problem
Login authentication succeeds (server returns 200 with access token), but the app never redirects to the dashboard. The `fetchRole()` function in `AuthContext.tsx` uses `supabase.from("user_roles").select(...)` which hangs silently, so `role` is never set and the Login page redirect never fires.

## Fix
Apply the same timeout + direct REST API fallback pattern to `AuthContext.tsx` that was already applied to the signup pages.

## Technical Details

### File: `src/contexts/AuthContext.tsx`

Update the `fetchRole` function (lines 28-35):

**Current code:**
```typescript
const fetchRole = async (userId: string) => {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  setRole((data?.role as AppRole) || null);
};
```

**New code:**
```typescript
const SUPABASE_URL = "https://dqvjkwrrxbtyziliyrkh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIs...";

const fetchRole = async (userId: string) => {
  try {
    // Try supabase client with 5s timeout
    const result = await Promise.race([
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]);
    if (result.data) {
      setRole((result.data.role as AppRole) || null);
      return;
    }
  } catch {
    // Fallback: direct REST call
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_roles?select=role&user_id=eq.${userId}&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
      setRole((data?.[0]?.role as AppRole) || null);
      return;
    }
  } catch {
    // both failed
  }
  setRole(null);
};
```

### Also add the same fallback to `Login.tsx`
The `supabase.auth.signInWithPassword` call also uses the Supabase client. Add a timeout + direct REST fallback for the login call itself, posting to `${SUPABASE_URL}/auth/v1/token?grant_type=password` as a fallback, and then manually triggering `fetchRole` via the auth state change.

### Files to modify
| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Add timeout + REST fallback to `fetchRole` |
| `src/pages/Login.tsx` | Add timeout + REST fallback to `signInWithPassword` call |
