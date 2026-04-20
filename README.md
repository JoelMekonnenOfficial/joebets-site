# JoeBets.com

Static site for Joe Bets — single `index.html`, a logo SVG, and a Netlify config. No build step, no framework.

## Files

- `index.html` — the whole site
- `logo.svg` — placeholder medallion logo (swap in your real PNG/SVG and update the `src` in `index.html`)
- `netlify.toml` — deploy config + security headers
- `README.md` — this file

## Getting auto-deploy working (edit → live in ~30 seconds)

The flow is: **GitHub** (stores your code) → **Netlify** (builds and hosts) → **GoDaddy** (points `joebets.com` at Netlify). Edit a file, push to GitHub, Netlify redeploys automatically.

### 1. Put the code on GitHub

1. Make a free GitHub account at github.com if you don't have one.
2. Create a new repo called `joebets-site` (private is fine).
3. On your computer, in the folder with these files, run:
   ```
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/joebets-site.git
   git push -u origin main
   ```
   GitHub will prompt for login the first time.

### 2. Connect Netlify

1. Go to netlify.com and sign up with your GitHub account.
2. Click **Add new site → Import an existing project → GitHub**.
3. Pick the `joebets-site` repo.
4. Build settings: leave everything default — `publish directory` is `.` and there's no build command. Click **Deploy**.
5. In 30 seconds you'll have a URL like `https://wonderful-otter-abc123.netlify.app`. That's your site, live.

Any future edits: open the file, change it, `git commit` and `git push`, and Netlify redeploys in about 30 seconds. You'll get an email every time it deploys.

### 3. Point joebets.com at Netlify (via GoDaddy DNS)

1. In Netlify: **Domain management → Add custom domain → `joebets.com`**. Netlify will give you either a set of nameservers or DNS records.
2. **Easier option — use Netlify's nameservers** (recommended):
   - Netlify shows you 4 nameservers (like `dns1.p01.nsone.net`).
   - In GoDaddy: **My Products → joebets.com → DNS → Nameservers → Change → Enter my own nameservers**. Paste the 4 Netlify nameservers. Save.
   - DNS propagation takes 1–24 hours. Usually under an hour.
3. **Alternative — keep GoDaddy nameservers, just edit records**:
   - In GoDaddy DNS, add:
     - `A` record: `@` → `75.2.60.5` (Netlify's load balancer)
     - `CNAME` record: `www` → `your-site-name.netlify.app`
   - Delete any existing conflicting `A`/`CNAME` records on `@` and `www`.
4. Netlify auto-provisions a free SSL cert (Let's Encrypt) once DNS resolves. Your site is live at `https://joebets.com`.

## Editing the site

Open `index.html`, find what you want to change, save, `git push`. That's it.

Common tweaks:
- **Logo**: replace `logo.svg` with your real logo file, or change the `src` on the three `<img>` tags (nav, hero medallion, footer) to point at your own file.
- **Copy**: search for the text you want to change in `index.html`. All content is inline.
- **Picks / markets / record numbers**: look for `<!-- PICKS -->`, `<!-- MARKETS -->`, `<!-- RECORD -->` comment blocks.
- **Gold Ticket price**: search for `$55` — appears in hero, pricing card, modal, nav CTA.

## Wiring real Stripe checkout (when you're ready)

Right now the "Get Gold Ticket" button opens a styled-but-fake checkout modal. To go live:

1. Create a Stripe account → create a Product "Gold Ticket" with a recurring $55/month price.
2. In Stripe dashboard, create a **Payment Link** for that price (fastest option, no code).
3. In `index.html`, find `function openCheckout()` and replace it with:
   ```javascript
   function openCheckout(){
     window.location.href = 'https://buy.stripe.com/YOUR_PAYMENT_LINK';
   }
   ```
4. Push to GitHub. Live in 30s.

For a fancier in-page flow (Stripe Checkout redirect with your own success page), see https://stripe.com/docs/payments/checkout.

## Contact form

The contact form currently just shows an alert. Easiest fix with Netlify: add `data-netlify="true"` to the `<form>` tag and Netlify Forms will capture submissions (free for 100/mo). Details: https://docs.netlify.com/forms/setup/.

## A note on the "/ghost" thing

There's nothing called "/ghost" that makes a website look human-made. What actually makes a site feel human is stuff like:
- Specific, opinionated copy instead of generic marketing language
- A real logo and real photography (swap that placeholder SVG)
- Quirky details and small imperfections (we've got the Playfair serif dropcap, the gambler's pull quote, the forum mockup — these help)
- Tone consistency — the drafts you wrote already do this well

If someone told you there's a technical trick, they were selling you something or confused. The site looking human is a copywriting and craft problem, not a deployment flag.

## Legal

This site advertises a paid betting-picks service. In most US jurisdictions, selling picks is legal but lightly regulated. Some things to keep in mind:
- The 21+ disclaimer and 1-800-GAMBLER references are standard.
- Claims about win rates and returns should be **actually backed by an audited record** — the `+218u`, `62%`, etc. in the template are placeholders. Swap them for your real numbers before going live.
- You'll probably want real Terms of Service and a Privacy Policy at some point. The footer links to `#` placeholders right now.
