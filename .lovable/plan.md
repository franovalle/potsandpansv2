

# Fix Logout Button - For Real This Time

## Root Cause
When `supabase.auth.signOut()` times out after 5 seconds, the fallback code on line 99 calls `supabase.auth.getSession()` to get the access token for a REST logout. But `getSession()` uses the same Supabase client that's hanging -- so it also hangs forever. The function never reaches the localStorage cleanup or state reset on lines 113-118, and `navigate("/")` in DashboardHeader never fires.

## Fix

### File: `src/contexts/AuthContext.tsx`

Remove the REST logout fallback entirely. It's unnecessary -- all we need to do is:
1. Try `supabase.auth.signOut()` with a timeout
2. If it fails/hangs, just clear localStorage and reset state directly

The server-side session will expire on its own. What matters is the user is logged out locally.

**Replace the entire `signOut` function (lines 90-119) with:**

```typescript
const signOut = async () => {
  try {
    await Promise.race([
      supabase.auth.signOut(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
  } catch {
    // Client hung or failed - that's fine, we'll clear locally
  }
  // Always clear state and storage regardless
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("sb-")) localStorage.removeItem(key);
  });
  setUser(null);
  setRole(null);
};
```

Key changes:
- Removed the fallback that calls `getSession()` (which also hangs)
- Reduced timeout from 5s to 3s for faster response
- The `catch` block is now empty -- we just fall through to cleanup
- localStorage cleanup and state reset always run no matter what

No changes needed to `DashboardHeader.tsx` -- it already has the correct `navigate("/")` call.

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Simplify `signOut` to remove the hanging `getSession()` fallback |

