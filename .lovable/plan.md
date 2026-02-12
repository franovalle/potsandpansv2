

# Fix Login - Role Fetch Using Wrong Credentials

## The Real Problem
The roles exist in the database for both users. The login itself succeeds. But the REST API fallback in `fetchRole()` sends the **anon key** as the Authorization token. The `user_roles` table has RLS policies that only allow **authenticated** users to read their own role. So the fallback always returns an empty array `[]`, the role is never set, and the redirect never fires.

## The Fix
Pass the user's actual **access token** to `fetchRole()` and use it in the REST fallback's Authorization header.

## Technical Details

### File: `src/contexts/AuthContext.tsx`

1. Change `fetchRole` to accept an access token parameter:
   ```typescript
   const fetchRole = async (userId: string, accessToken?: string) => {
   ```

2. In the REST fallback, use the access token instead of anon key for Authorization:
   ```typescript
   headers: {
     apikey: SUPABASE_ANON_KEY,
     Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
   }
   ```

3. Update both call sites (`onAuthStateChange` and `getSession`) to pass `session.access_token`:
   ```typescript
   await fetchRole(currentUser.id, session?.access_token);
   ```

### File: `src/pages/Login.tsx`

4. In the direct REST login fallback, after `setSession` succeeds, the `onAuthStateChange` listener will fire and call `fetchRole` with the correct token -- no additional changes needed here beyond what's already done.

### Files to modify
| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Pass access token to `fetchRole`, use it in REST fallback Authorization header |

