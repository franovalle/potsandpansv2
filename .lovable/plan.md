

# Fix Agency Dropdown + Text Updates

## 1. Fix Agency Dropdown (HHASignup.tsx)
- Add error handling and logging to the `useEffect` that fetches agencies
- Use `async/await` with `try/catch` to surface any errors
- Add a loading state so the dropdown shows "Loading agencies..." while fetching
- Log the response to help diagnose if the query returns an error

## 2. Landing Page Headline Update (Index.tsx)
- Change the hero `h1` from "Supporting Bronx Home Health Aides through verified business donations" to **"Connecting businesses with Bronx healthcare heroes"**

## 3. HHA Dashboard Title (HHADashboard.tsx)
- Change the page title from "Your Dashboard" to **"HHA DASHBOARD"** (all caps)

## 4. Role Badge in Header (DashboardHeader.tsx)
- The role badge currently uses CSS `capitalize` on the role string, which renders "hha" as "Hha"
- Fix this so "hha" displays as **"HHA"** (all caps) by adding a display mapping instead of relying on `capitalize`

---

## Technical Details

### Files to modify:

**`src/pages/HHASignup.tsx`** (lines 21-25)
- Replace the bare `.then()` with an async function inside useEffect
- Add error logging and a `loadingAgencies` state
- Update the Select component to show a loading placeholder

**`src/pages/Index.tsx`** (line 13)
- Update headline text to "Connecting businesses with Bronx healthcare heroes"

**`src/pages/HHADashboard.tsx`** (line ~113)
- Change `"Your Dashboard"` to `"HHA DASHBOARD"`

**`src/components/DashboardHeader.tsx`** (line 17-19)
- Replace `capitalize` CSS class with a display function that uppercases "hha" to "HHA" and capitalizes other roles properly

