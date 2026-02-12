

# Fix Logout + Redirect Logged-in Users Away from Login

## Problems
1. **Logout button does nothing** -- `supabase.auth.signOut()` hangs silently (same client issue as login/signup). No timeout, no fallback, no navigation.
2. **After logout, should go to landing page** -- Currently `signOut` clears state but never navigates anywhere.
3. **Login page visible when already logged in** -- The redirect logic exists but depends on `role` being set, which can fail due to the same client issues.

## Fix

### 1. Fix signOut in AuthContext.tsx
- Add timeout + direct REST fallback to `supabase.auth.signOut()` (POST to `/auth/v1/logout`)
- Clear localStorage session manually as a safety net
- This ensures state is always cleaned up even if the client hangs

### 2. Add navigation after logout in DashboardHeader.tsx
- Import `useNavigate` from react-router-dom
- After `signOut()` completes, navigate to `/` (landing page)

### 3. Login page already redirects logged-in users
- The existing `useEffect` on Login.tsx (lines 23-29) handles this when `user` and `role` are set. With the role fetch now fixed, this should work. No changes needed here.

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Add timeout + REST fallback to `signOut`, clear localStorage |
| `src/components/DashboardHeader.tsx` | Add `useNavigate`, redirect to `/` after signOut |

