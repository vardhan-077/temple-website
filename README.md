# Temple Website

A complete, self-hosted website for a temple: dynamic settings, a year-by-year
photo gallery, temple history timeline, committee directory, Razorpay-powered
online donations, a live-ish donation leaderboard, festival countdown, and a
mobile-friendly admin panel to manage all of it — no code changes needed for
day-to-day updates.

## Features

- **Dynamic temple settings** — name, tagline, address, phone/email/WhatsApp, target donation amount, all editable from the admin panel.
- **Donation progress bar** that updates automatically as donations come in.
- **Bank details + UPI display**, with a QR code and one-tap copy buttons.
- **Razorpay donations** — secure server-side order creation and payment verification, plus a webhook for reliable confirmation.
- **Live donation leaderboard** (top donors), with an anonymous-donation option and an admin visibility toggle per entry.
- **Photo galleries grouped by year**, with a lightbox viewer.
- **Temple history** page with an editable story and a timeline of milestones.
- **Upcoming Programs** page — pujas, festivals and events with date/time/location, automatically highlighted on the homepage when they fall within the next 10 days.
- **Latest Announcements** strip on the homepage — short, undated notices with an automatic "Read more" expand link for longer messages.
- **Committee directory** with photos, roles and contact numbers.
- **Festival countdown timer**, fully configurable (name + date/time).
- **Floating "Donate Now" and WhatsApp buttons** on every page.
- **Contact form**, saved to the admin panel (no email server required).
- **Mobile-friendly admin panel** for everything above, protected by login.
- Required legal pages for payment-gateway compliance: Privacy Policy, Terms, Refund/Cancellation Policy.
- Gold-and-maroon temple visual theme, fully responsive.

## Tech stack

Node.js + Express, MongoDB (via Mongoose), EJS templates, vanilla CSS/JS (no
build step), Razorpay Node SDK, optional Cloudinary for photo storage.

---

## 1. Local setup

### Prerequisites

- **Node.js 18 or newer** — check with `node -v`.
- **A MongoDB database** — either:
  - MongoDB installed locally (`mongodb://127.0.0.1:27017`), or
  - A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (recommended — see step 4 below, works for both local development and production).

### Install & configure

```bash
npm install
cp .env.example .env
```

Open `.env` and fill in at least `MONGODB_URI`. Everything else has a
working default for local testing (Razorpay and Cloudinary are optional to
start with — the site runs fine without them, just with online payments and
photo uploads disabled until you add those keys).

### Seed placeholder content & create your admin login

```bash
npm run seed
```

This fills the database with realistic placeholder content (temple name,
sample history, committee, gallery photos) and creates your first admin
account using `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env`. It's safe to
run more than once — it only fills in what's missing and never overwrites
content you've already edited.

### Run it

```bash
npm start          # production mode
# or
npm run dev         # auto-restarts on file changes (requires devDependencies)
```

Visit `http://localhost:3000` for the site and `http://localhost:3000/admin/login`
for the admin panel. **Log in and change the seeded password immediately**
(Admin → My Account).

---

## 2. Adding your temple's real content

Everything is editable from the admin panel — you don't need to touch code:

- **Admin → Temple Settings**: name, address, contact info, donation goal, bank/UPI details, festival countdown, logo, hero photo, social links.
- **Admin → Gallery**: upload photos, tagged by year.
- **Admin → History**: your temple's story and a timeline of milestones. Each milestone can have an optional historical photo attached — upload one when adding a milestone, or later use "Edit" to add/replace it, "Remove Photo" to drop just the image, or "Delete" to remove the whole milestone.
- **Admin → Programs**: upcoming pujas/festivals/events (name, date & time, location, description, optional photo). Anything within the next 10 days shows automatically on the homepage; the full list lives at `/programs`. Use "Hide from site" to pull a program off the public pages without deleting it.
- **Admin → Announcements**: short notices with no date (e.g. "Temple closed for renovation"). Add a title and, optionally, a longer message — messages over ~130 characters automatically get a "Read more" expand link on the homepage. Use "Hide from site" to pull one down temporarily, or Delete to remove it for good. The "Short Location" field for the homepage banner lives under Admin → Temple Settings → General Information.
- **Admin → Committee**: members, roles, photos.
- **Admin → Donations → Add Manual Donation**: record real donors (cash, cheque, bank transfer, or any offline gift) so they count toward the goal and appear on the public leaderboard — separate from the Committee list. Toggle "Visible on Leaderboard" per entry, or turn a donation anonymous to show "Anonymous Devotee" publicly while you still keep the real name privately in the admin table.
- **Admin → Donations**: see all donations, and manually add offline (cash/cheque/bank-transfer) donations so they count toward the goal and leaderboard.
- **Admin → Messages**: everything submitted through the public Contact form.

The Privacy Policy, Terms, and Refund Policy pages (linked in the footer)
use your temple name/contact details automatically, but **read through them
and adjust the wording for your organization** — they're solid starting
templates, not a substitute for legal advice specific to your trust.

---

## 3. Setting up Razorpay (online donations)

1. Create a free account at [dashboard.razorpay.com](https://dashboard.razorpay.com/) if you don't have one.
2. While your account is in **Test Mode** (the default for a new account), go to **Settings → API Keys** and generate a key pair. Put them in `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. Restart the server. The Donate page will now show the "Pay Online" tab and accept test payments — use [Razorpay's published test card/UPI numbers](https://razorpay.com/docs/payments/payments/test-card-upi-details/) to try a full payment end to end.
4. Set up the webhook (recommended — it's what confirms a payment even if a donor closes their browser right after paying):
   - In the Razorpay dashboard, go to **Settings → Webhooks → Add New Webhook**.
   - Webhook URL: `https://<your-domain>/api/razorpay/webhook`
   - Active events: at least `payment.captured`.
   - Choose a secret, and put it in `.env` as `RAZORPAY_WEBHOOK_SECRET`.
5. **Going live**: Razorpay will need your trust/organization's KYC documents before it issues live keys (this is a regulatory requirement for all Indian payment aggregators, not something specific to this site). Once approved, switch `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` to your live keys (`rzp_live_...`) and update the webhook with your live-mode secret. Razorpay's KYC review typically also checks that your site has visible Privacy/Terms/Refund policy pages and clear contact details — this site already has all of those.

Without any Razorpay keys configured, the site still works fully — the
"Pay Online" tab shows a friendly message and visitors can use the Bank
Transfer / UPI tab instead.

---

## 4. Setting up MongoDB Atlas (free, works for local + production)

1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a new project.
2. Deploy a cluster and choose the **free (M0)** tier.
3. Under **Database Access**, create a database user with a username and password.
4. Under **Network Access**, add an IP allowlist entry. For getting started, `0.0.0.0/0` (allow from anywhere) is the simplest option; once deployed, most hosts (Render, Railway, etc.) use dynamic IPs so this is normal for a small site, but a VPS with a static IP can be locked down to just that IP.
5. Click **Connect → Drivers**, copy the connection string (it looks like `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/`), and put it in `.env`/your host's environment variables as `MONGODB_URI` — add your database name at the end, e.g. `.../temple-website?retryWrites=true&w=majority`.

The free M0 tier (512MB storage) is comfortably enough for this site's data
(donations, settings, gallery/committee metadata — photos themselves are
better kept out of MongoDB; see the Cloudinary section below).

---

## 5. Setting up Cloudinary (recommended for photo uploads in production)

Gallery, committee and branding photos you upload from the admin panel are
saved to local disk (`public/uploads/`) by default, which is perfect for
local use or a VPS with persistent storage. However, **some free hosts
(notably Render's free tier) wipe local disk on every redeploy**, which
would silently delete uploaded photos. Cloudinary sidesteps this entirely:

1. Create a free account at [cloudinary.com](https://cloudinary.com/users/register/free) (no credit card required).
2. From your Cloudinary dashboard, copy your **Cloud Name**, **API Key** and **API Secret**.
3. Add them to `.env` / your host's environment variables:
   ```
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```
4. Restart the server. New uploads will automatically go to Cloudinary instead of local disk — nothing else changes.

If you're deploying to a VPS or any host with a persistent filesystem, this
step is optional.

---

## 6. Deploying

Any host that runs Node.js works. The easiest free-to-start path:

### Option A: Render (recommended for getting started)

1. Push this project to a GitHub repository.
2. On [render.com](https://render.com), create a **New Web Service** and connect your repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Add all your `.env` values under the service's **Environment** tab (Render does not read your local `.env` file — you re-enter the variables there).
5. Deploy. Render gives you a `https://your-app.onrender.com` URL immediately — open it and make sure the site loads before touching DNS.
6. Note: Render's free tier spins the service down after ~15 minutes of inactivity (a visitor's first request after that takes a few extra seconds to wake it up) and has a non-persistent filesystem — use MongoDB Atlas and Cloudinary (both above) so this doesn't affect your data or photos. Render's paid tiers remove both limitations.

### Connecting a GoDaddy domain to Render

1. In the Render dashboard, open your web service → **Settings → Custom Domains → Add Custom Domain**, and add both `yourdomain.com` and `www.yourdomain.com`. Render will show you the DNS records it expects.
2. In GoDaddy: sign in → **My Products → your domain → DNS** (or **Manage DNS**).
3. Add these two records (GoDaddy doesn't support the ALIAS/ANAME record type some other providers offer for root domains, so use the A-record fallback):
   - **Type:** `A` · **Name:** `@` · **Value:** `216.24.57.1` *(Render's documented fallback IP for the root/apex domain — double check it still matches what your Render dashboard shows before saving)*
   - **Type:** `CNAME` · **Name:** `www` · **Value:** `your-app.onrender.com` (the address Render gave you in step 5 above)
   - If GoDaddy already has an `AAAA` record on your domain, delete it — Render's docs specifically call this out as a conflict.
4. Save, then go back to Render and click **Verify** next to your domain. DNS changes are often live within the hour but can take up to 48 hours; Render issues a free HTTPS certificate automatically once verification succeeds.
5. Once verified, update `RAZORPAY_WEBHOOK_SECRET`'s webhook URL in the Razorpay dashboard to use your real domain (`https://yourdomain.com/api/razorpay/webhook`) instead of the `onrender.com` address.

### Option B: GitHub + Vercel (also free)

This repo includes `vercel.json` and `api/index.js`, which adapt the app to run as a Vercel serverless function — no extra setup needed on your end beyond the steps below. Two things work differently on Vercel than on Render, though:

- **Cloudinary is required, not optional.** Vercel's filesystem is read-only at runtime, so local photo uploads (the fallback used when Cloudinary isn't configured) will fail outright. Complete section 5 above (Cloudinary) *before* deploying to Vercel.
- **Uploaded file size is capped lower.** Vercel's free tier limits request bodies to a few MB, tighter than this app's own 5MB limit. Keep individual photo uploads under ~4MB to be safe.

**Steps:**

1. **Push this project to a GitHub repository** (skip if you already did this for Render):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
   Then create a new repository on [github.com/new](https://github.com/new) and follow its "push an existing repository" instructions to push your local commit there.
2. Create a free account at [vercel.com](https://vercel.com) (signing up with your GitHub account makes the next step easier).
3. Click **Add New → Project**, and import the GitHub repository you just pushed.
4. Vercel auto-detects the Node.js app - leave Build Command and Output Directory blank/default.
5. Before clicking Deploy, open **Environment Variables** and add every value from your `.env` file (`MONGODB_URI`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, Cloudinary keys, and Razorpay keys once you have them) - Vercel doesn't read your local `.env` file. Also add `NODE_ENV=production`.
6. Click **Deploy**. Vercel gives you a `https://your-project.vercel.app` URL - open it and confirm the site loads before touching DNS.
7. Any time you `git push` to your repo's main branch afterward, Vercel redeploys automatically.

#### Connecting a GoDaddy domain to Vercel

1. In the Vercel dashboard, open your project → **Settings → Domains**, and add `yourdomain.com`. Vercel will show you the exact DNS records it wants (they're usually the ones below, but check - they can change).
2. In GoDaddy: sign in → **My Products → your domain → DNS** (or **Manage DNS**).
3. Add:
   - **Type:** `A` · **Name:** `@` · **Value:** `76.76.21.21` *(Vercel's standard apex IP - confirm against what your Vercel dashboard shows)*
   - **Type:** `CNAME` · **Name:** `www` · **Value:** `cname.vercel-dns.com`
   - Delete any conflicting `AAAA` record on `@`.
4. Save, then return to Vercel - it verifies automatically once DNS propagates (often within the hour, up to 48 hours) and issues a free HTTPS certificate.
5. Update your Razorpay webhook URL to `https://yourdomain.com/api/razorpay/webhook` once the domain is verified.

### Option C: Railway, a VPS, or existing shared hosting

- **Railway** or similar Node-friendly platforms work the same way as Render: connect the repo, set the environment variables, deploy.
- **A VPS** (DigitalOcean, Hetzner, etc.) gives you a persistent filesystem (so local photo uploads work without Cloudinary) and full control; run the app with a process manager like `pm2` behind Nginx for HTTPS.
- Typical **shared/cPanel hosting** in India is usually PHP-oriented and may not run Node.js directly — check whether your host offers a "Node.js App" option (some Hostinger/GoDaddy plans do via Passenger) before choosing this route.

Whichever host you choose, always set `NODE_ENV=production` and a long,
random `SESSION_SECRET` in production.

---

## 7. Before you consider it fully "live"

A short checklist:

- [ ] Replaced all placeholder content (temple details, history, committee, gallery) with the real thing.
- [ ] Changed the seeded admin password (Admin → My Account).
- [ ] Reviewed the Privacy Policy / Terms / Refund Policy text for your organization.
- [ ] Set real bank details and a real UPI ID (Admin → Settings) and uploaded your actual UPI QR code.
- [ ] Added MongoDB Atlas + (if needed) Cloudinary so data and photos persist reliably.
- [ ] Switched Razorpay from test keys to live keys after KYC approval, and re-pointed the webhook at the live secret.
- [ ] Made at least one real, small end-to-end test donation once live keys are active.
- [ ] Set a custom domain and confirmed the site loads over HTTPS (required for Razorpay Checkout in production).

### Tightening security before you go fully live

This app already does the security-critical things correctly by default:
Razorpay orders are created and payment signatures verified **server-side
only** (the secret key never reaches the browser), admin passwords are
hashed with bcrypt, session cookies are `httpOnly` + `SameSite=Lax` (which
blocks the common cross-site request forgery patterns), and there's rate
limiting on login and donation-creation endpoints.

One thing is intentionally left for you to enable once you've tested live
payments: a strict Content-Security-Policy (CSP) header. It's off by
default (see the comment in `server.js`) because a mistuned CSP can silently
block the Razorpay Checkout script/iframe, and a broken donate button is
worse than a missing header. Once payments work end-to-end on your domain,
you can turn on `helmet`'s `contentSecurityPolicy` option, allowlisting at
least `checkout.razorpay.com` and `api.razorpay.com` for `script-src`,
`connect-src` and `frame-src`, and `fonts.googleapis.com`/`fonts.gstatic.com`
for fonts.

---

## Project structure

```
api/index.js    Vercel serverless entry point (delegates to server.js)
config/         Database + Cloudinary configuration
models/         Mongoose schemas (Settings, Donation, GalleryImage, Program, ...)
middleware/     Admin auth guard
routes/         public.js (site pages), api.js (donations/leaderboard JSON),
                admin.js (admin panel), webhook.js (Razorpay webhook)
utils/          Razorpay helpers, image upload (Cloudinary/local), money &
                date formatting
views/          EJS templates - views/public, views/admin, views/partials
public/         CSS, client-side JS, and placeholder images
scripts/        seed.js (placeholder content), generate-placeholders.js
server.js       App entry point (also exported for use by api/index.js)
vercel.json     Routes every request to api/index.js on Vercel
```

## Troubleshooting

- **"Failed to start: connect ECONNREFUSED ..."** — `MONGODB_URI` is wrong or your database isn't reachable. If using Atlas, double check the Network Access allowlist and that the password in the connection string is URL-encoded if it contains special characters.
- **Uploaded photos disappear after a while** — you're likely on a host with a non-persistent filesystem (e.g. Render free tier after a redeploy). Add Cloudinary credentials (see section 5).
- **The Donate page shows "online payments aren't set up yet"** — `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are missing from your environment.
- **A payment succeeded in Razorpay but doesn't show on the site** — check that the webhook (section 3, step 4) is configured and that `RAZORPAY_WEBHOOK_SECRET` matches what's in the Razorpay dashboard; check your host's logs for `[webhook]` messages.
- **Festival countdown / date fields look off by several hours** — the admin's festival date/time field is always interpreted as India Standard Time (UTC+5:30) regardless of what timezone your server runs in, so this should self-correct; if it doesn't, confirm your server's system clock is correct.
- **On Vercel: photo uploads fail or 500 errors on image-heavy admin pages** — almost always means Cloudinary isn't configured. Vercel's filesystem can't be written to at runtime, so the local-disk fallback errors out. Add the three `CLOUDINARY_*` environment variables in Vercel's project settings and redeploy.
- **On Vercel: everything 404s** — check that `vercel.json` and the `api/` folder were included in your GitHub push (`git status` shouldn't show them as untracked/ignored), and that the Vercel project's root directory setting points at the repo root.

---

Built with Node.js, Express, MongoDB and Razorpay.
