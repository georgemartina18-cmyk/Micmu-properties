# Indexing preparation validation — 4 November 2026

Passed on the final implementation:

- `npm test`: 167 tests across 12 files. SEO coverage includes fail-closed launch gating, demo exclusion, canonical identity, sitemap routes/filtering/failure handling, private/draft noindex headers and safe factual Organization JSON-LD.
- `npm run typecheck`, `npm run lint`, `git diff --check`.
- Production webpack standalone builds with `MICMU_LAUNCH_APPROVED=true` and `false`.
- Launch-enabled production browser suite: 6 checks passed across desktop/mobile. Confirmed public canonical-host responses have no noindex header; alternate hosts remain noindex; private/draft paths retain noindex; distinct metadata/canonicals, homepage Organization JSON-LD, www redirect with query preservation, true missing-page 404, and open robots/populated static sitemap.
- Final launch-disabled production browser suite plus staff smoke suite: 8 checks passed across desktop/mobile. Confirmed global noindex, blocked robots, empty sitemap, protected routes and staff access boundaries.
- Cloudflare packaging: `npx opennextjs-cloudflare build --skipNextBuild` passed after the standalone production build (`NEXT_PRIVATE_STANDALONE=true NEXT_PRIVATE_OUTPUT_TRACE_ROOT=/workspace/Micmu-properties npx next build --webpack`).

The browser server had no Supabase configuration, so database-published property/content detail journeys, actual company contacts and edge behavior require live follow-up. A first browser pass exposed streamed 200 responses for nonexistent pages; public loading boundaries were removed/scoped to private sections and metadata streaming disabled. Final tests confirm 404 responses.

No production HTTP audit was possible: the outbound proxy denied the official domain and the web reader could not retrieve it. This does not establish a live-site outage. Cloudflare dashboard build/runtime overrides, DNS/HTTPS/www routing, live HTML/headers and Search Console eligibility remain unverified. No DNS record or Search Console submission was made; Google's account-specific verification token has not been supplied. The repository launch setting remains false, and draft legal pages remain excluded. See `docs/GOOGLE_INDEXING.md` for the readiness report and exact verification/submission steps.
