

# Fix Business Signup + Remove Subtitle

## Problems
1. **Business signup hangs on "Creating Account..."** -- The `supabase.functions.invoke("signup-business")` call never produces a network request, meaning the Supabase client is not functioning. The button stays disabled with "Creating Account..." forever.
2. **Landing page subtitle** still shows "Connecting caring businesses with the heroes who serve our community." and needs to be removed.

## Root Cause
The Supabase client is created with `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. If these are undefined at runtime, the client silently hangs on all operations (no error, no request). This affects both the Business Signup edge function call and the HHA Signup agency fetch.

## Fix

### 1. Add direct REST API fallback to BusinessSignup.tsx
Instead of relying solely on `supabase.functions.invoke()`, add a timeout and fallback using a direct `fetch()` call to the edge function URL:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  // Try Supabase client first
  const res = await supabase.functions.invoke("signup-business", {
    body: { business_name, business_type, email, password },
  });
  clearTimeout(timeout);
  // handle response...
} catch {
  // Fallback: direct fetch to edge function
  const response = await fetch(
    `https://dqvjkwrrxbtyziliyrkh.supabase.co/functions/v1/signup-business`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": "...",
        "Authorization": "Bearer ..."
      },
      body: JSON.stringify({ business_name, business_type, email, password }),
    }
  );
  // handle response...
}
```

### 2. Same fallback pattern for HHASignup.tsx
Apply the same timeout + direct REST fallback for:
- The agency dropdown fetch (`supabase.from("agencies").select(...)`)
- The signup call (`supabase.functions.invoke("signup-hha", ...)`)

### 3. Remove subtitle from Index.tsx
Delete line 15-17 (the `<p>` tag with "Connecting caring businesses with the heroes who serve our community.").

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/BusinessSignup.tsx` | Add timeout + direct fetch fallback for signup call |
| `src/pages/HHASignup.tsx` | Add timeout + direct fetch fallback for agency fetch and signup call |
| `src/pages/Index.tsx` | Remove subtitle paragraph (lines 15-17) |

