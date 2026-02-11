

# Pots & Pans Platform — Full Implementation Plan

## Overview
A community donation platform connecting Bronx Home Health Aides (HHAs) with local businesses that donate goods. Features verified signups, fair donation distribution, QR-code-based redemption, and admin oversight.

---

## 1. Design System & Theming
- **Primary**: Burgundy red (#8B0000), **Secondary/Background**: Cream (#FAF7F0)
- Headings in Quicksand (playful, rounded), body in Inter (clean sans-serif)
- Rounded corners on all cards/buttons, gentle fade animations
- Fully responsive mobile + desktop
- Uploaded **Pots & Pans logo** displayed in top-left of all pages, linking to home

---

## 2. Landing Page (Public)
- Hero section with the Pots & Pans logo and tagline: *"Supporting Bronx Home Health Aides through verified business donations"*
- Hashtag: #itDoesntHaveToEnd · Est. 2025
- Two prominent CTAs: **"I'm a Home Health Aide"** → HHA signup, **"I'm a Business"** → Business signup
- Clean, inviting layout in burgundy/cream palette

---

## 3. Authentication & User Roles (Lovable Cloud / Supabase)
- **Three roles**: `hha`, `business`, `admin`
- **HHA Signup**: Full name + agency dropdown → verify against roster table → if match, create account; if not, show error
- **Business Signup**: Business name, email, password, business type
- **Login**: Single page for all roles, redirects to role-appropriate dashboard
- Pre-created admin: `admin@potsandpans.com` / `Admin123!`

---

## 4. HHA Dashboard
- Check fair distribution for available donations
- **If available**: Animated fade-in card — *"Thank you for serving the Bronx. Claim your [item]"* + large "Claim" button
- **After claiming**: Live QR code rotating every 60 seconds with countdown timer; expiry info (3-day claim, 7-day redemption window)
- One active donation per HHA at a time
- **If none available**: Friendly "Check back soon!" message
- Donation history of past claimed/redeemed items

---

## 5. Business Dashboard
- **Create Donation** form: item name, quantity, redemption end date, agency selection (specific or "Distribute Fairly")
- Auto-distributes to eligible HHAs on submit
- **Active donations table**: Item, Quantity, Claimed, Redeemed, Status
- **Scan QR Code**: Camera-based scanning, validates token server-side, shows success or specific error reason

---

## 6. Admin Dashboard
- **Stats overview**: Total agencies, registered HHAs, donations created, claim rate %, redemption rate %
- **Manage Agencies**: List with employee counts, add new agency
- **Manage Roster**: Table (name, contact, agency), add/remove employees
- **View All Donations**: All campaigns with distribution status

---

## 7. Fair Distribution Algorithm (Edge Function)
- "Distribute Fairly" splits quantity evenly across all agencies
- Prioritizes HHAs who have never received a donation, then rotates by oldest last donation
- No HHA gets a second until all eligible in their agency have received one
- Unclaimed after 3 days → rolls to next eligible HHA
- Statuses: `pending` → `claimed` → `redeemed` or `expired`

---

## 8. Database Schema (Supabase)
- **agencies**, **rosters**, **hha_profiles**, **business_profiles**, **donation_campaigns**, **donation_claims**
- Full RLS: HHAs see own data, businesses see own donations, admin sees all
- QR tokens unique and validated server-side

---

## 9. Pre-Populated Demo Data
- 1 admin account (`admin@potsandpans.com`)
- 3 agencies with 5 roster entries each (15 total, roster only — not user accounts)
- 3 sample donation campaigns from fictional businesses, auto-distributed via fair algorithm

