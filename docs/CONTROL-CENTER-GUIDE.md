# BossBimbz HQ — Control Center User Guide

**Version 1.0 · For Bimbo Oyedotun (BossBimbz)**
*This guide covers every feature, button, and screen in the Control Center dashboard, step by step.*

---

## Table of Contents

1. [Getting Access — Creating Your Admin Account](#1-getting-access--creating-your-admin-account)
2. [Logging In for the First Time](#2-logging-in-for-the-first-time)
3. [The Control Center Layout](#3-the-control-center-layout)
4. [Dashboard Overview](#4-dashboard-overview)
5. [Leads CRM](#5-leads-crm)
6. [Appointments](#6-appointments)
7. [Blog](#7-blog)
8. [DBA Products & Sales](#8-dba-products--sales)
9. [DBA Courses](#9-dba-courses)
10. [UltraTidy Finances — Inflow, Expenses & Inventory](#10-ultratidy-finances--inflow-expenses--inventory)
11. [Farm Overview & Reports](#11-farm-overview--reports)
12. [Farm Managers](#12-farm-managers)
13. [Account Settings](#13-account-settings)
14. [Quick Reference — Status Meanings](#14-quick-reference--status-meanings)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Getting Access — Creating Your Admin Account

Your login account is tied to your email address in the system. There are two ways an admin account gets created:

### Option A — Your account already exists
Your developer has pre-created your account. You will have received an email from Supabase with a magic link, or been given a temporary password directly. Skip to Section 2.

### Option B — Creating a new admin account (for yourself or a trusted person)
Only your developer (Tony) can create new admin accounts directly. There is no self-registration for the Control Center — this is intentional to keep it secure.

**To request a new admin account, provide:**
- Full name
- Email address
- A temporary password (you will change it on first login)

Tony will create the account in Supabase and add the `admin` role. The person will then log in and immediately change their password under Settings.

> ⚠️ **Never share your admin login with anyone.** If someone needs access, create a separate account for them.

---

## 2. Logging In for the First Time

### Step 1 — Go to the login page
Open your browser and go to:
```
https://leads.ultratidycleaning.com/login
```
You will see a page titled **"Control Center"** with a sign-in form.

### Step 2 — Enter your credentials
- **Email:** Your admin email address (e.g. `hello@ultratidycleaning.com`)
- **Password:** Your password (minimum 6 characters)

To see your password as you type it, click the **eye icon** (👁) on the right side of the password field. Click it again to hide it.

### Step 3 — Click Sign In
Click the **"Sign In"** button. You will see a spinning loader while it authenticates.

- If your credentials are correct → you are redirected to the Dashboard
- If incorrect → you will see a red error message. Double-check your email and password.

### Step 4 — Change your password immediately (first login)
On your very first login, go to **Settings** (bottom-left of the sidebar, under your name) and change your password to something only you know. See Section 13 for how to do this.

---

## 3. The Control Center Layout

Once logged in, you will see two main areas:

### The Sidebar (left panel)
The dark purple sidebar on the left is your main navigation. It contains:

| Section | Pages inside |
|---------|-------------|
| **Overview** | Dashboard (home) |
| **CRM** | Leads, Appointments |
| **Content** | Blog |
| **Businesses** | DBA Products, Courses, UltraTidy, Farm |
| **Team** | Farm Managers |

**On desktop:** The sidebar can be collapsed to icon-only mode by clicking the **◀ arrow** at the top right of the sidebar. Click the **▶ arrow** that appears to expand it again.

**On mobile/tablet:** The sidebar is hidden. Tap the **☰ (menu icon)** at the top-left of the screen to open it as a slide-out panel. Tap any link and it closes automatically.

### Your Profile (bottom of sidebar)
At the very bottom of the sidebar is your avatar (circle with your initials). Click it to open a small menu with two options:
- **Settings** — change your email or password
- **Sign out** — log out of the Control Center

### The Main Content Area (right side)
This is where each page loads. Every page has:
- A **header** with the page title and any page-level buttons
- **Cards or tables** with the actual data
- **Action buttons** specific to that page

---

## 4. Dashboard Overview

**URL:** `https://leads.ultratidycleaning.com/dashboard`

This is your home page. It gives you a bird's-eye view of all three businesses at a glance.

### Summary Cards (top row)
Five cards show key numbers at a glance:

| Card | What it shows |
|------|--------------|
| **Leads (this month)** | How many new enquiries/leads came in during the current calendar month |
| **Published Posts** | Total number of blog posts live on the website |
| **Farm Revenue** | Total money recorded from all farm sales (in Naira ₦) |
| **DBA Sales** | Total revenue from Digital Boss Academy product sales |
| **Pending Appointments** | How many booked appointments are still awaiting confirmation |

> These numbers update in real time whenever new data is added.

### Charts (middle row)

**Leads by Status (bar chart — left)**
Shows a bar for each lead status: New, Contacted, Quoted, Booked, Completed, Lost. Helps you see at a glance where most leads are stuck in the pipeline.

**Leads by Business (pie chart — right)**
Shows the proportion of leads from each business:
- 🟢 UltraTidy (aquagreen)
- 🟣 DBA (purple)
- 🟡 Primefield (amber)

### Quick Actions (right column)
Four shortcut buttons:
- **Add Lead** — go directly to the Leads page to add a new lead
- **New Blog Post** — go to the blog editor to write a new post
- **View Appointments** — go to the Appointments page
- **Add DBA Product** — go to the DBA product creation form

### Recent Leads (bottom table)
Shows the 10 most recently created leads. Each row shows:
- Name (clickable — opens the full lead detail)
- Service requested
- Status badge (colour-coded)
- Date created

Click any name to open the full lead profile.

---

## 5. Leads CRM

**URL:** `https://leads.ultratidycleaning.com/dashboard/leads`

This is your central database of everyone who has contacted any of your three businesses. Every enquiry from the website, every DBA registration, and every Primefield contact lands here.

### Understanding the Lead List

At the top you will see **"X total leads"** showing the total count.

**Two action buttons (top right):**
- **Export CSV** — downloads all visible leads as a spreadsheet you can open in Excel or Google Sheets
- **Add Lead** — manually add a lead (e.g. from a phone call or WhatsApp message)

### Filtering & Searching

Three filters let you narrow down the list:

1. **Search bar** — type any name, email, or phone number. The list filters instantly as you type.
2. **Status filter** — filter by lead status (New, Contacted, Quoted, Booked, Completed, Lost)
3. **Business filter** — filter by which business the lead came from (UltraTidy, DBA, Primefield)

> **Tip:** Use "Business: DBA" to see all DBA course registrations. Use "Business: UltraTidy" to see all cleaning enquiries.

### The Leads Table

Each row shows:
- **Name** — click to open the full lead profile
- **Service** — what they enquired about
- **Status badge** — colour-coded (see Section 14)
- **Date** — when the lead was created

### Pagination
If you have many leads, they are split into pages. Use the **Previous / Next** buttons at the bottom, and the **Page X of Y** indicator shows where you are.

### Adding a Lead Manually

Click **"Add Lead"**. A form slides in from the side. Fill in:
- **Name** (required)
- **Email** (required)
- **Phone**
- **Business** — which of your three businesses this is for
- **Service** — what they want
- **Source** — how they found you (website, WhatsApp, referral, etc.)
- **Notes** — anything extra you want to record

Click **Save**. The lead appears at the top of the list.

### Opening a Lead Profile

Click any lead's name. You are taken to a dedicated page for that lead. This page has two sections:

**Left — Contact Information:**
- Full name with status badge
- Email (click to open your email app)
- Phone (click to call on mobile)
- Service, business, property size, date needed
- **Notes area** — a text box where you can type anything about this lead. Click **"Save Notes"** after typing. The button is only active when you have made changes.
- Timestamps showing when the lead was created and last updated

**Right — Actions Panel:**

*Change Status dropdown:*
Choose from: New → Contacted → Quoted → Booked → Completed → Lost

Select the new status and the page updates immediately. The status pipeline at the top visually shows progress.

*Send Email buttons:*
- **Booking Confirmation** — sends a professional confirmation email to the lead's email address
- **Thank You + Review** — sends a thank-you email with a link to leave a Google review (use this after completing a job)

*Delete Lead:*
Click **"Delete Lead"** (red text, bottom of actions). A confirmation box appears. Click **"Yes, Delete"** to permanently remove the lead. This cannot be undone.

### Real-Time Notifications
If someone fills in the contact form on your website while you have the Leads page open, a **toast notification** will pop up at the bottom of your screen showing the new lead's name and service.

---

## 6. Appointments

**URL:** `https://leads.ultratidycleaning.com/dashboard/appointments`

This page shows all booking appointments submitted through your website's booking form.

### Filtering by Status
Use the **"Filter by status"** dropdown at the top right to show only:
- **All** (default)
- **Pending** — awaiting your confirmation
- **Confirmed** — you have confirmed the appointment
- **Completed** — the job is done
- **Cancelled** — the appointment was cancelled

### The Appointments Table

Each row shows:
- **Name** — the customer's name
- **Date** — appointment date (e.g. Mar 25, 2026)
- **Time** — scheduled time
- **Service** — type of cleaning
- **Status badge** — colour-coded
- **Contact** — their email and phone as clickable links
- **Action buttons** — depend on current status:

| Current Status | Buttons Available |
|---------------|------------------|
| Pending | **Confirm** (turns it confirmed) + **Cancel** (red) |
| Confirmed | **Complete** (marks as done) + **Cancel** (red) |
| Completed | No action buttons |
| Cancelled | No action buttons |

**Workflow example:**
1. Customer books online → appointment appears as **Pending**
2. You call to confirm → click **Confirm** → status changes to **Confirmed**
3. Job is done → click **Complete** → status changes to **Completed**

---

## 7. Blog

**URL:** `https://leads.ultratidycleaning.com/dashboard/blog`

Manage all blog posts on `ultratidycleaning.com/blog`.

### The Blog List

**Search bar** — type any word to filter posts by title or URL slug.

**New Post button** — opens the blog post editor.

The table shows all posts with:
- **Title**
- **Slug** (the URL path, e.g. `5-tips-for-a-clean-home`)
- **Status** — Draft or Published
- **Published date**
- **Edit / Delete** buttons

### Creating a New Blog Post

Click **"New Post"**. You are taken to the rich text editor.

**Fields to fill in:**

1. **Title** (required) — the headline of your post
2. **Slug** — the URL. Auto-generated from your title. You can edit it but keep it lowercase with hyphens (e.g. `how-to-clean-hardwood-floors`)
3. **Excerpt** — a short 1-2 sentence summary shown in the blog listing
4. **Meta Description** — what appears in Google search results (aim for 120–160 characters)
5. **Featured Image** — click to upload an image. This appears at the top of the post and in social media previews
6. **Content** — the main body. Use the formatting toolbar to:
   - Add headings (H1, H2, H3)
   - Bold, italic, underline text
   - Add bullet or numbered lists
   - Insert images
   - Add links (highlight text, click the link icon, paste a URL)

**Saving your post:**
- **Save as Draft** — saves without publishing. The post is not visible on the website yet. Use this while you are still writing.
- **Publish** — makes the post live on `ultratidycleaning.com/blog` immediately.

### Editing an Existing Post

Click the **Edit** (pencil) icon next to any post. Make your changes and click **Save** or **Publish**.

### Deleting a Post

Click the **Delete** (trash) icon. A confirmation box appears. Click **Confirm** to permanently delete the post.

> ⚠️ Deleting a published post removes it from the website immediately.

---

## 8. DBA Products & Sales

These pages help you manage Digital Boss Academy digital products and manually log sales.

### DBA Overview Page
**URL:** `https://leads.ultratidycleaning.com/dashboard/dba`

Three summary cards:
- **Total Products** — how many products you have created
- **Active Products** — how many are currently for sale
- **Revenue (recent)** — total sales revenue

Two action buttons:
- **Manage Products** → goes to the products list
- **Log Sale** → opens the log sale form

A table at the bottom shows your most recent sales.

---

### DBA Products
**URL:** `https://leads.ultratidycleaning.com/dashboard/dba/products`

**Adding a New Product:**
Click **"+ Add Product"**. You are taken to a creation form. Fill in:
- **Product Name** — e.g. "Business Starter Ebook"
- **Description** — what the product is
- **Price** — the selling price
- **Status** — Active (visible/for sale) or Inactive (hidden)

Click **Save**.

**The Products Table** shows all products with their price, status, and edit/delete buttons.

Clicking **Delete** shows a warning: *"All associated sales will also be deleted."* Confirm only if you are sure.

---

### DBA Sales
**URL:** `https://leads.ultratidycleaning.com/dashboard/dba/sales`

This page shows every recorded sale. Use it to track who bought what and how much revenue you have earned.

**Logging a Sale Manually:**
Click **"Log Sale"**. A form appears. Fill in:
- **Buyer Name**
- **Buyer Email**
- **Product** — choose from your active products
- **Amount** — the sale amount
- **Payment Method** — how they paid
- **Date**

Click **Save**. The sale appears in the table.

> **Note:** Sales from the Stripe checkout are logged automatically when a student pays online. This manual form is for sales you close over WhatsApp, email, or in person.

---

## 9. DBA Courses

**URL:** `https://leads.ultratidycleaning.com/dashboard/courses`

This page controls the registration flow for your current DBA course. Students who go to `bboconcepts.com` register here before being sent to Stripe to pay.

### Active Course Card

Displays:
- **Course Name** — the name shown on the Stripe checkout page
- **Price** — what students pay (must match your Stripe setting exactly)
- **Stripe Payment Link** — the link students are sent to after registering

**To update the course details:**
1. Click the **Edit** button (pencil icon, top right of the card)
2. Edit mode opens with three fields:
   - **Course Name** — e.g. "Digital Boss Academy — Live Mentorship Session"
   - **Price (USD $)** — enter the exact amount (e.g. `20.00`)
   - **Stripe Payment Link** — paste the link from your Stripe dashboard (starts with `https://buy.stripe.com/...`)
3. Click **Save Changes**

> ⚠️ **Important:** The price here must exactly match what you set in Stripe. This is for display only — the actual charge happens on Stripe.

### Registration Link Card

Shows your student registration link: `https://bboconcepts.com`

- **Copy icon** / **Copy Link button** — copies the link to your clipboard. Paste it into WhatsApp, Instagram bio, Facebook posts, etc.
- **Preview Page button** — opens `bboconcepts.com` in a new tab so you can see what students see

### How It Works (summary)
1. You share `https://bboconcepts.com` on social media
2. A student clicks the link and fills in their name, email, and phone
3. They are redirected to your Stripe payment page to pay
4. Once registered, their details appear in **Leads** (filtered by DBA)
5. They receive an automatic confirmation email

---

## 10. UltraTidy Finances — Inflow, Expenses & Inventory

This section helps you track the financial health and supplies of your UltraTidy cleaning business. Think of it as your simple business ledger.

### UltraTidy Overview
**URL:** `https://leads.ultratidycleaning.com/dashboard/ultratidy`

Five summary cards:
- **Total Inflow** — total revenue recorded from cleaning jobs (CAD)
- **Total Expenses** — total money spent (CAD)
- **Net Profit** — Inflow minus Expenses
- **Low Stock Items** — inventory items running low
- **Pending Entries** — any items needing attention

Two charts:
- **Inflow by Service** — bar chart showing revenue by cleaning type
- **Expenses by Category** — pie chart showing where money is being spent

---

### Recording Inflow (Revenue)
**URL:** `https://leads.ultratidycleaning.com/dashboard/ultratidy/inflow`

Every time you complete a cleaning job and get paid, record it here.

**"+ Add Inflow" button** — opens a form with these fields:

| Field | What to enter |
|-------|--------------|
| **Date** | The date you received payment |
| **Client Name** | The customer's name |
| **Service Type** | Residential / Commercial / Deep Clean / Move-In-Out / Post-Construction / Airbnb / Other |
| **Amount (CAD)** | How much you were paid |
| **Payment Method** | Cash / E-Transfer / Cheque / Credit Card |
| **Notes** | Any extra details (e.g. job address, special notes) |

Click **Save**. The entry appears in the inflow table.

**The Inflow Table** columns:
- Date
- Client Name
- Service
- Amount (bold, green)
- Payment Method
- Notes

**Filtering:** Use the **Service** dropdown to filter by service type. Use the **date range** filter to see a specific period.

**Export CSV** — download all inflow records for your accountant.

---

### Recording Expenses
**URL:** `https://leads.ultratidycleaning.com/dashboard/ultratidy/expenses`

Record every business-related cost here — cleaning supplies, fuel, equipment, etc.

**"+ Add Expense" button** — opens a form with these fields:

| Field | What to enter |
|-------|--------------|
| **Date** | Date the expense was incurred |
| **Category** | Supplies / Transport / Equipment / Labor / Marketing / Utilities / Other |
| **Description** | What you bought or paid for |
| **Amount (CAD)** | How much it cost |
| **Paid To** | Supplier name or person paid |
| **Payment Method** | Cash / E-Transfer / Cheque / Credit Card |
| **Notes** | Receipt number, any extra details |

Click **Save**. The expense appears in the table.

**The Expenses Table** columns:
- Date
- Category
- Description
- Amount (bold, red)
- Paid To
- Payment Method

**Filtering:** Use the **Category** dropdown to filter by expense type.

---

### Inventory (Supplies & Equipment)
**URL:** `https://leads.ultratidycleaning.com/dashboard/ultratidy/inventory`

Track your cleaning supplies and equipment so you never run out in the middle of a job.

The page has **three tabs:**

#### Tab 1 — Current Stock
A table showing every item with:
- **Item Name** — e.g. "Multipurpose Spray", "Mop Heads", "Latex Gloves"
- **Category** — Supplies / Equipment / Protective Gear / Other
- **Quantity** — how many are in stock
- **Unit** — units, litres, kg, rolls, pairs, bottles
- **Reorder Level** — the minimum quantity before you need to restock
- **Status badge:**
  - 🟢 **In Stock** — quantity above reorder level
  - 🟡 **Low** — quantity at or near reorder level
  - 🔴 **Out of Stock** — quantity is zero

**Adding a new item:**
Click **"+ Add Item"**. Fill in the item name, category, starting quantity, unit, and reorder level. Click **Save**.

**Updating stock (add or remove):**
Click the **+ / −** button on any row (or "Update Stock"). Choose:
- **Add** — received new stock
- **Use** — used items on a job
- **Dispose** — threw away damaged/expired items
- **Adjust** — correction entry

Enter the quantity and a brief note. Click **Save**.

#### Tab 2 — Transactions
A full history of every stock movement — what was added, used, disposed, or adjusted — with the date, quantity, and reason.

#### Tab 3 — Low Stock Alerts
Shows only items that are at or below their reorder level. Use this as your shopping list when ordering supplies.

---

## 11. Farm Overview & Reports

These pages are read-only summaries of what the Primefield farm managers log on their end. You cannot add data here — it comes from `farm.primefieldagric.com`.

### Farm Overview
**URL:** `https://leads.ultratidycleaning.com/dashboard/farm`

Five summary cards:
- **Total Revenue** — all farm sales (₦ Naira)
- **Total Expenses** — all farm costs (₦ Naira)
- **Net Profit** — Revenue minus Expenses (₦ Naira)
- **Products Tracked** — number of livestock/product types in inventory
- **Total Mortality** — total livestock deaths recorded

Two charts:
- **Revenue by Product** — bar chart (catfish, goat, chicken)
- **Expenses by Category** — pie chart (feed, labor, utilities, veterinary, transport, equipment)

Three navigation buttons: **View Sales · View Expenses · View Inventory**

A table at the bottom shows current inventory levels.

---

### Farm Sales
Shows all sales logged by the farm managers. Columns: Date, Customer, Product, Qty, Unit Price, Total.

**Filter by product:** All / Catfish / Goat / Chicken / Other

---

### Farm Expenses
Shows all expenses logged by the farm managers. Columns: Date, Category, Amount, Paid To, Payment Method.

**Filter by category:** All / Feed / Labor / Utilities / Veterinary / Transport / Equipment

---

### Farm Inventory
Three tabs:

**Current Stock** — what is in stock now, with colour-coded status (In Stock / Low / Out of Stock)

**All Transactions** — every inventory movement (add, remove, sale, mortality)

**Mortality** — detailed mortality statistics per product:
- Mortality rate percentage
- Deaths vs. surviving animals
- Mortality log with dates and causes

---

## 12. Farm Managers

**URL:** `https://leads.ultratidycleaning.com/dashboard/managers`

Manage who can log into the Primefield Farm Portal at `farm.primefieldagric.com`.

### The Manager List

Each manager card shows:
- **Name** and **email**
- **Date they were added**
- **"Suspended" badge** (red) if their account is suspended

**Three action buttons per manager:**

| Button | What it does |
|--------|-------------|
| **🔑 Reset Password** | Set a new password for this manager (use when they forget it) |
| **⊘ Suspend** | Block this manager from logging in (amber button, shown when active) |
| **✓ Reactivate** | Re-enable a suspended manager (green button, shown when suspended) |
| **🗑️ Remove** | Permanently delete their account |

> **When to Suspend vs Remove:**
> - **Suspend** when someone is on leave or you want to temporarily block access. Their data is preserved.
> - **Remove** only when they permanently leave. Their account is deleted but their past entries remain in the records.

### Adding a New Farm Manager

Click **"+ Add Manager"**. A dialog box opens.

Fill in:
1. **Full Name** — e.g. "Chidi Okeke"
2. **Email Address** — e.g. `chidi@primefield.ng`
3. **Password** — minimum 8 characters, must include at least one uppercase letter and one number
4. **Confirm Password** — type it again to confirm

Click the **eye icon** on either password field to show/hide what you are typing.

Click **"Create Account"**. A success message appears.

**Share the credentials with your new manager securely** (e.g. via WhatsApp, not email). Tell them to log in at `farm.primefieldagric.com`.

### Resetting a Manager's Password

1. Find the manager in the list
2. Click **"🔑 Reset Password"**
3. A dialog opens — type the new password (minimum 8 characters)
4. Click **"Update Password"**
5. Share the new password with the manager

---

## 13. Account Settings

**URL:** `https://leads.ultratidycleaning.com/dashboard/settings`

Access settings from the **bottom of the sidebar** (click your avatar, then Settings).

### Account Information Card

Shows your current:
- **Email address**
- **Role** (displayed as a badge — "admin")

### Changing Your Email Address

1. Click in the **"New Email Address"** field and type your new email
2. In **"Current Password (to confirm)"**, type your current password (click eye icon to see it)
3. Click **"Change Email"**
4. A success toast appears. Your login email is now updated.

> You will need to use the new email address next time you log in.

### Changing Your Password

Use this whenever you want to update your password, or if you think your account may have been compromised.

1. **Current Password** — type the password you currently use
2. **New Password** — type your new password (minimum 8 characters, must include at least one uppercase letter and one number)
3. **Confirm New Password** — type the new password again exactly
4. Click **"Change Password"**

All password fields have an **eye icon** — click to show/hide what you are typing.

**Requirements for your new password:**
- At least 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 number (0-9)
- Both "New Password" and "Confirm" fields must match

On success, a green toast message appears saying **"Password changed successfully"** and the fields clear.

> **If you forget your password:** Contact your developer (Tony) to reset it from the Supabase admin panel.

---

## 14. Quick Reference — Status Meanings

### Lead Statuses

| Status | Colour | Meaning |
|--------|--------|---------|
| **New** | 🔵 Blue | Just came in. Not yet contacted. |
| **Contacted** | 🟡 Yellow | You have reached out to them. |
| **Quoted** | 🟠 Orange | You have sent them a price. |
| **Booked** | 🟢 Green | They have confirmed and a job is scheduled. |
| **Completed** | 🩵 Aqua | The job is done and closed. |
| **Lost** | 🔴 Red | They did not proceed (went elsewhere, no response, etc.) |

**Recommended workflow:**
New → Contacted → Quoted → Booked → Completed

Use **Lost** when you close out a lead that did not convert.

---

### Appointment Statuses

| Status | Colour | Meaning |
|--------|--------|---------|
| **Pending** | 🟡 Yellow | Submitted but not yet confirmed by you |
| **Confirmed** | 🔵 Blue | You have confirmed the date/time with the client |
| **Completed** | 🟢 Green | The cleaning job is done |
| **Cancelled** | 🔴 Red | The appointment was cancelled |

---

### Blog Post Statuses

| Status | Meaning |
|--------|---------|
| **Draft** | Saved but not visible on the website |
| **Published** | Live on `ultratidycleaning.com/blog` |

---

### Inventory Stock Statuses

| Status | Colour | Meaning |
|--------|--------|---------|
| **In Stock** | 🟢 Green | Quantity is above the reorder level |
| **Low** | 🟡 Yellow | Quantity is at or near the reorder level — order soon |
| **Out of Stock** | 🔴 Red | Zero quantity — urgent restock needed |

---

## 15. Troubleshooting

### "I can't log in — it says invalid credentials"
- Double-check your email — make sure there are no typos
- Make sure Caps Lock is off
- Try clicking the **eye icon** to see your password as you type
- If you are still locked out, contact your developer to reset your password

### "The page is loading slowly"
- Check your internet connection
- Try refreshing the page (press F5 or Ctrl+R)
- If the dashboard is loading very slowly, wait a moment — it sometimes takes 1-2 seconds after a period of inactivity

### "I deleted something by accident"
- Deleted leads, posts, and managers **cannot be recovered** from the dashboard
- Contact your developer (Tony) immediately — data can be recovered directly from the database if caught early

### "A farm manager says they can't log in"
1. Go to **Farm Managers**
2. Find their account and check if they show a **"Suspended"** badge — if so, click **Reactivate**
3. If not suspended, click **Reset Password**, set a new one, and share it with them
4. Tell them to log in at `farm.primefieldagric.com`

### "The DBA registration price is showing wrong"
Go to **Courses → Edit** and update the price to match what is set in your Stripe dashboard. These must match exactly.

### "New leads are not appearing"
- Check your internet connection
- Refresh the Leads page
- The dashboard updates in real time, but a page refresh will always pull the latest data

### "I want to give someone else admin access"
Contact your developer (Tony) to create a new admin account. Do not share your own login.

---

*This guide was prepared for Mrs. Bimbo Oyedotun (BossBimbz) by Tony Orjiako.*
*Last updated: March 2026*
*For technical support, contact: tony@bboconcepts.com*
