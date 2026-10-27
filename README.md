# MICMU Properties Limited

A mobile-first property website and management foundation built with Next.js, TypeScript, Supabase and the Cloudflare OpenNext adapter. The navy, ivory and gold identity is provisional. All architectural artwork is original illustration, not a photograph of a MICMU property.

**Status: development preview, not a launched or production-approved platform.** Supabase has been connected in the development environment and public database reads have been verified. The initial owner account has an admin role; its personal authenticator is not paired yet. Cloudflare website deployment is still pending. No real property inventory, prices, office contacts, business divisions, testimonials or financial claims are seeded.

## Run the website

Use Node.js 24 and npm. In the existing checkout:

```bash
cd /workspace/Micmu-properties
npm ci --cache /tmp/micmu-npm-cache
cp .env.example .env.local  # only if .env.local does not already exist
npm run dev
```

The development server uses port 3000. Open that port through your development environment's supported port forwarding, or open the local server in a browser on the same machine. Cloud onboarding does not provide a public website preview. No public URL has been created.

`MICMU_DEMO_MODE=true` enables three prominently labeled fictional records **only in development**. Samples cannot be booked, saved, verified or included in production. For real data, configure Supabase and apply the migrations. See [deployment instructions](docs/DEPLOYMENT.md).

## Client requirements update

The uploaded client PDF has been reviewed. The owner confirmed retaining the existing technology while adding its functionality. This revision adds rental/search/location/review controls, saved searches, recent views, dashboard notifications and additional CMS/media support. See [client requirement coverage](docs/CLIENT_REQUIREMENTS_REVIEW.md) for what is implemented and what remains. The proposal timeline and billing terms are not adopted.

## What is implemented

- Responsive editorial homepage, accessible mobile navigation, property listing/detail pages, shareable filters, and honest loading/error/empty states.
- About, confirmed businesses, estates, developments, articles, FAQs, contact, partnerships, realtor application, inspections and reference checks.
- Supabase email/password account flows, confirmation/recovery handling, profile editing, saved properties, own inspection/support history, private documents, payment records and realtor records.
- Server-checked administrator area: property editor, draft/published content, company settings, incoming request management, realtor approval, Supabase image uploads and audit log.
- PostgreSQL migrations, row-level security, server-only enquiry submission, idempotency, email-based submission limits and audit triggers.
- Lite Mode preference, reduced motion, no autoplay, no third-party fonts or trackers, no automatic maps, and a narrowly scoped production offline fallback.
- Cloudflare Workers/OpenNext build configuration, pre-launch noindex, security headers and environment template.

Features requiring external services deliberately return unavailable states until configured. Implemented code is not evidence of live service integration. [Implementation status](docs/STATUS.md) lists all limitations, deferred modules and verification results.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run cf:build
npm run cf:preview
```

Browser tests use system Chromium at `/usr/bin/chromium`; set `CHROMIUM_PATH` for another installed Chromium executable. Otherwise install Playwright Chromium and set `CHROMIUM_PATH` to its executable. The current environment blocks the Playwright browser download domain, but provides system Chromium.

Unit/integration tests use PGlite (actual PostgreSQL in WASM) with a minimal Auth/Storage harness to exercise the migrations and RLS. They do not connect to a live Supabase project. Browser tests use clearly labeled development samples and intentionally unconfigured service states. Live authentication, upload and delivery tests remain launch prerequisites.

## Owner guides

- [Admin guide](docs/ADMIN_GUIDE.md)
- [Deployment and secure configuration](docs/DEPLOYMENT.md)
- [Content approval checklist and research](docs/RESEARCH.md)
- [Content inventory template](docs/content-inventory.csv)
- [Architecture and decisions](docs/ARCHITECTURE.md)
- [Security and launch checklist](docs/LAUNCH_CHECKLIST.md)
- [Implementation status and remaining roadmap](docs/STATUS.md)

Never put passwords or API secrets in chat, commits, screenshots or documentation. Configure secret values through the hosting provider's secure settings.

### Image storage

New approved image uploads use the existing Supabase project, not Cloudflare R2.
Apply `supabase/migrations/202610280001_supabase_images.sql` in the MICMU SQL Editor before testing uploads. It creates a private `micmu-images` bucket with a 5 MB JPEG/PNG/WebP limit. Only MFA-verified administrators can write; approved images can be read publicly through the existing media URLs. Ownership evidence remains private. No additional environment keys are required. Older R2 object keys remain readable if their original binding is present.

Storage and downloads count toward the existing Supabase plan's limits; this does not activate a new subscription. Live upload testing is required after the migration and Cloudflare deployment.
