# Validation evidence — 26 October 2026

- Clean `npm ci` completed with the final pinned lockfile and dependency overrides.
- TypeScript check and ESLint passed.
- Vitest: **31 passed** across three test files. Includes input/file validation, server route failure/success boundaries, actual PostgreSQL migration execution and RLS/access/rate/idempotency tests in PGlite. Provider calls in route unit tests are mocked; PGlite uses a minimal Auth/Storage test harness.
- Playwright: **15 passed, 1 skipped**. The skipped case is the mobile menu test in the desktop project; it passes in the mobile project. Chromium runs at desktop and iPhone-sized viewports, with search/detail/empty states, Lite Mode persistence, unconfigured forms, protected routes, cross-origin writes, no-overflow checks and an axe homepage scan at both sizes.
- Next production build and OpenNext Cloudflare Worker build passed.
- Local Cloudflare workerd: **39 passed**. Public pages/noindex, no production samples, private route redirect, rejected unsafe writes, honest missing-backend errors, four network simulations, offline fallback, reconnection and production Lite Mode. Exact network settings and single-run results are in `worker-results.json`.
- Final `npm audit`: **zero known vulnerabilities**, including development tools. See `audit-summary.json`. This is a point-in-time registry result.
- Saved environment `install_script` and `start_skill` draft. No publication or fresh-task restoration has been performed.

No live Supabase, R2, Turnstile, email delivery, physical Android/iPhone, production deployment, complete security review or full WCAG certification is claimed. The Chromium mobile project is emulation, not Safari or a physical iPhone. No real customer data was submitted. Slow-network times are local single-run measurements, not field Core Web Vitals or uptime commitments.

The test output screenshots in `test-results/home-desktop.png` and `test-results/home-mobile.png` show the development UI and clearly labeled fictional listings. Generated artifacts are ignored by Git.

## Lighthouse 13.5.0

One mobile-emulated run against the local compiled Worker scored **Performance 98, Accessibility 100, Best practices 100, SEO 63**. The only failed SEO audit was `is-crawlable`: preview meta/HTTP robots directives and robots.txt deliberately block indexing. Do not remove these until launch approval. The additional Lighthouse agentic-browsing category scored 50; it is recorded without claiming that optional agent-oriented capabilities are implemented. See `lighthouse-summary.json` for configuration and measured metrics. These are local audit results, not field or physical-device scores, and do not establish full WCAG compliance.

Reproduction command (requires a running local Worker on port 8787):

```bash
CHROME_PATH=/usr/bin/chromium npm --cache /tmp/micmu-npm-cache exec --yes --package=lighthouse@13.5.0 -- lighthouse http://127.0.0.1:8787 --chrome-flags='--headless --no-sandbox --disable-dev-shm-usage' --output=json --output-path=/tmp/micmu-lighthouse.json --quiet
```
