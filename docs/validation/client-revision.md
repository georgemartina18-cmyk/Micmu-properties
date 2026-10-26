# Client PDF revision validation — 26 October 2026

This report applies to the changes described in `../CLIENT_REQUIREMENTS_REVIEW.md`. Earlier baseline scores are not presented as current measurements.

- **TypeScript:** passed.
- **ESLint:** passed.
- **Unit/server/PostgreSQL tests:** 43 passed across four files. New coverage includes sale/rent separation and price periods, combined hierarchical filters, furnishing/bathrooms/date/features, safe saved-search parameters, publication approval, archival privacy, rental constraints, saved-search ownership and private property-change notifications. All five migration files execute in the PGlite PostgreSQL harness.
- **Browser tests:** 23 passed, 1 skipped. The skip is the desktop invocation of the mobile-only navigation test; that test passes in the mobile project. Both desktop/mobile runs cover cascading state/LGA filters, rental results/price periods, unconfigured saved-search messaging, device history and an automated accessibility scan of the property search page, alongside the earlier homepage/account checks.
- **Production build:** Next.js and OpenNext Cloudflare Worker builds passed. Final smoke checks confirmed the updated privacy notice and continued production sample exclusion.
- **Compiled Worker:** 39 checks passed, including four simulated network profiles, private-route protection, unavailable-service responses, offline fallback and Lite Mode persistence.
- **Provider boundary:** no live Supabase/Auth/Turnstile/R2/email service was configured or claimed working. Database tests use actual PostgreSQL with a minimal test Auth/Storage harness; browser tests use labeled fictional records. New migration files have not been applied to an external database.
- **Source preservation:** retained the existing application/brand and earlier migration files; no technology migration, production deployment, provider purchase or destructive customer-data operation was performed.

Local compiled Worker checks and four simulated network profiles are recorded separately in `client-worker-results.json`. This includes offline recovery and confirms production excludes fictional inventory. Timings are local single-run simulations, not physical-device performance or field Core Web Vitals.

Review screenshots: `test-results/client-rental-desktop.png` and `test-results/client-rental-mobile.png` (generated/ignored artifacts).

Still requires staging validation: real authentication, admin editing/approval/archive/restore, gallery upload/storage, database notifications, save/remove/search/history workflows with real accounts, agent/landlord implementation and external delivery integrations. A successful build does not certify these live-provider operations.
