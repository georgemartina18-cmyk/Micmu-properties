# Deploying to Cloudflare — owner guide

No deployment has been performed. Do not run a publish command until you approve the domain, content, security review and any provider charges.

## 1. Prepare provider accounts

Use your own Cloudflare and Supabase accounts. Keep credentials in provider dashboards or a secure environment settings panel; never send them in chat. Confirm plan costs before creating paid resources. Decide database region, backups, retention and legal processing arrangements.

## 2. Set up Supabase

Create a fresh project. Use its SQL editor or Supabase migration tooling to apply, in order:

- `supabase/migrations/202610260001_core.sql`
- `supabase/migrations/202610260002_server_submission.sql`
- `supabase/migrations/202610260003_marketplace_requirements.sql`
- `supabase/migrations/202610260004_dashboard_notifications.sql`
- `supabase/migrations/202610260005_approved_people_content.sql`

Do this first on a test project. The migrations create no sample listings and no default administrator. Application uses public schema tables with RLS. The private `client-documents` PDF bucket is also created.

Set these values in `.env.local` for local development, or secure build/runtime settings for deployment:

| Name                                   | Purpose                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Your Supabase project URL                                                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public publishable/anon key (not a secret service key)                        |
| `SUPABASE_SECRET_KEY`                  | Server-only secret/service role key for validated enquiries; never public     |
| `NEXT_PUBLIC_SITE_URL`                 | Exact approved origin; localhost for development, HTTPS domain for production |

`NEXT_PUBLIC_*` variables must be present **when building**. Changing them requires rebuilding. Server-only secrets must be available to the Worker at runtime. Use `wrangler secret put SUPABASE_SECRET_KEY` locally after approving deployment, or Cloudflare dashboard settings. Do not place secrets in `wrangler.jsonc` or commit `.dev.vars`.

In Supabase Auth, enable email confirmation, configure your approved Site URL and allowed callback URLs, SMTP delivery and provider rate limits. Set password policy to at least 12 characters. Configure recovery and confirmation email templates to use the app confirmation handler, e.g.:

```
{{ .SiteURL }}/auth/confirm#token_hash={{ .TokenHash }}&type=recovery
{{ .SiteURL }}/auth/confirm#token_hash={{ .TokenHash }}&type=signup
```

The app displays a confirmation button and verifies only after an explicit same-origin POST. Do not link directly to `{{ .ConfirmationURL }}` in the reset template: that endpoint verifies before the app is reached. Use the complete [reset template](email-templates/reset-password.html), including its `#` fragment and `&amp;` HTML escaping, after deploying the callback. Disable email link tracking that rewrites authentication links. Test actual messages, expiration, replay and recovery end-to-end without recording their URLs or credentials. The callback also handles PKCE codes, retains `sb_flow_id` and routes recovery to `/reset-password`. See [recovery diagnosis](PASSWORD_RECOVERY.md). Enable TOTP MFA in Supabase. After signing in, use Account security to enroll and verify an authenticator. The application and database require aal2 for admin actions. Validate this on staging, including recovery when staff lose a device.

Create the first administrator account normally and confirm its email. As database owner, find its exact user id in Supabase Authentication, then run:

```sql
insert into public.user_roles(user_id,role)
values ('REPLACE_WITH_THE_CONFIRMED_USER_UUID','admin');
```

Replace the text with the verified UUID; never grant the role to an unknown account. There is no automatic/default admin password.

## 3. Protect public forms

Create a Turnstile widget scoped to your domain (check provider pricing/terms). Configure `NEXT_PUBLIC_TURNSTILE_SITE_KEY` at build and `TURNSTILE_SECRET_KEY` securely at runtime. The server checks both the challenge and its hostname. Do not use test keys for a live launch.

Forms require the database, server submission key and Turnstile. They do not report successful delivery when these are missing. Enquiries are recorded in the database; email confirmations and automatic admin notifications are **not connected**. Do not promise email delivery until an approved transactional email provider and outbox/retry workflow are implemented and tested.

## 4. Connect approved public media

Use the existing MICMU Supabase project. Run
[`202610280001_supabase_images.sql`](../supabase/migrations/202610280001_supabase_images.sql)
in its SQL Editor. This additive, rerunnable migration creates the private
`micmu-images` bucket and access policies. It does not alter `client-documents`.
No R2 subscription, binding, or new secret key is needed for new uploads.

MFA-verified administrators can upload JPEG, PNG and WebP images up to 5 MB.
The upload form requires ownership evidence and explicit public-image approval.
Only objects with approved metadata can be read anonymously. The media API keeps
its `/api/media/<id>` URLs. Previously stored R2 assets still require their
original `MICMU_MEDIA` binding; new objects use `supabase/approved/` keys.

After Cloudflare deploys, test one permitted image in Administration → Media
library, open the returned URL in an Incognito window, and attach its path to a
draft property. Storage/download usage counts against the existing Supabase
plan's limits. Do not upload private customer records through this interface.
Responsive derivatives and transformations still need validation before a
high-volume launch. Videos use a separate workflow.

## 5. Build and validate a local Worker

```bash
npm ci --cache /tmp/micmu-npm-cache
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run cf:build
npm run cf:preview
```

`cf:preview` uses Wrangler's local Worker runtime, not production. Cloud sandboxes may need writable tool directories: `XDG_CONFIG_HOME=/tmp/micmu-config WRANGLER_LOG_PATH=/tmp/micmu-wrangler.log npm run cf:preview`.

For local Worker secret bindings, use an ignored `.dev.vars` file. Never use a production database for automated test data. Validate live staging authentication, RLS, form persistence, retries, Supabase images and private document access before publishing.

## 6. Production approval and domain

Keep `MICMU_LAUNCH_APPROVED=false` while legal documents, branding and business content are awaiting approval. All pages then send noindex and robots disallows crawling. This is a crawler instruction, **not access control**: do not expose confidential drafts through a public deployment.

After the owner approves launch and any charges, build using the approved environment and deploy with `npm run cf:deploy`. Connect the chosen domain through Cloudflare Workers Domains & Routes, following the dashboard's DNS instructions. Do not invent DNS targets. Check the HTTPS certificate, HTTPS-only redirect, correct origin/callback settings and security headers. Configure HSTS at Cloudflare only after validating the domain and all affected subdomains. Set WAF/rate limits for auth, enquiry and verification APIs. Never use a blanket public cache rule on APIs, auth, admin, dashboards or private document URLs.

No public property/page cache is configured initially, so content changes don't leave a cached public price. Images allow short public caching after approval. Set public asset compression at Cloudflare, avoid caching Set-Cookie responses and test purge/revocation behavior.

Enable privacy-approved monitoring and optional Cloudflare Web Analytics only after deciding data handling; no analytics beacon is active. Add error alerting without logging passwords, tokens or enquiry bodies. Test database backup restoration and incident response. Complete the launch checklist and set `MICMU_LAUNCH_APPROVED=true` only after the required work passes; rebuild/redeploy and verify sitemap, metadata and crawl behavior.

## Network destinations

The current cloud package-manager preset permits installation. Live service work also needs the actual `<project>.supabase.co`, `challenges.cloudflare.com`, relevant Cloudflare APIs, and the approved domain. Research needs `www.fazonagroup.org`, `www.facebook.com` and `developers.cloudflare.com`; these were blocked here. Browser installation needs `cdn.playwright.dev`, although system Chromium is available. Add exact required destinations in environment settings rather than disabling TLS verification or broadening to all Internet hosts.
