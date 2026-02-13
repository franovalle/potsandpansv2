# Demo Walkthrough

**Live URL**: [https://potsandpans.lovable.app](https://potsandpans.lovable.app)

## Prerequisites

Seed the admin account (one-time):
```bash
curl -X POST <SUPABASE_URL>/functions/v1/seed-admin
```

## Demo Script

### Step 1: Admin Setup

1. Log in as **admin@potsandpans.com** / **Admin123!**
2. Add agency: **Bronx Home Care Services**
3. Add employee to roster: **Maria Rodriguez** under that agency

### Step 2: Business Signup

1. Click **Business Sign Up**
2. Register with business name: **Bronx Deli** (exact name triggers auto-campaign)
3. The system automatically:
   - Creates a "Chicken Sandwich" donation campaign (qty: 1)
   - Distributes it to eligible HHAs at Bronx Home Care Services
4. Dashboard shows: **"Donations sent to Bronx Home Care Services"**

### Step 3: HHA Signup

1. Click **HHA Sign Up**
2. Enter name: **Maria Rodriguez**
3. Select agency: **Bronx Home Care Services**
4. The system verifies Maria against the roster and creates her account
5. On signup, she is auto-assigned the pending Chicken Sandwich donation

### Step 4: HHA Claim & QR Code

1. Log in as Maria
2. The demo reset runs automatically — ensuring a fresh pending donation
3. Dashboard shows the **Chicken Sandwich** donation with a "Claim" button
4. Click **Claim Donation**
5. A **scannable QR code image** appears with:
   - A 60-second countdown timer
   - Automatic token rotation when the timer expires
   - A new QR code generated each rotation

### Step 5: Business Redemption

1. Log in as the Bronx Deli business account
2. Copy the QR token from Maria's dashboard (or scan the QR code)
3. Paste the token into the validation field
4. Click **Validate & Redeem**
5. Success confirmation — donation marked as redeemed

## Repeatable Demo

The demo is designed to be **infinitely repeatable**:

- Every time Maria logs in, the `reset-hha-demo` edge function automatically:
  1. Deletes all her existing donation claims
  2. Creates a fresh "Chicken Sandwich" pending claim
- This means you can demo the full claim → QR → redeem flow as many times as needed

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@potsandpans.com | Admin123! |
| Business | *(created during demo)* | *(set during signup)* |
| HHA | *(created during demo)* | *(set during signup)* |
