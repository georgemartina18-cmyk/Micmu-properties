# Google indexing preparation — 4 November 2026

## Current release status

The repository launch switch remains `MICMU_LAUNCH_APPROVED=false` in `wrangler.jsonc`. Public indexing is intentionally still blocked. This request prepares the site; it does not establish that the draft legal text or other business launch checks have been approved.

Live requests to `micmuproperties.com.ng` were blocked by this workspace's outbound policy; a separate web reader also could not retrieve the site. This is a limitation of this audit, not evidence the website is down. Actual production response headers, Cloudflare variable overrides, DNS, certificate/redirect behavior and database-published content still need live verification.

## Implemented

- One canonical identity: `https://micmuproperties.com.ng`, independent of localhost, preview URLs or trailing-slash environment values.
- Distinct titles/descriptions, canonical links and Open Graph URLs for public pages, published property details and published content details. Property search parameters canonicalize to `/properties`.
- Homepage Organization JSON-LD with company name, canonical URL and logo, plus contact/address/social information only when present in public company settings. No invented office address, hours, ratings, registration details or prices. Organization markup does not claim LocalBusiness rich-result eligibility. JSON is escaped before embedding.
- Runtime robots/sitemap generation. Closed gate: disallow all, no sitemap advertised, empty sitemap, public noindex metadata/header. Open gate: advertise the canonical sitemap, allow public crawling and exclude private/draft paths. The sitemap includes all public sections and only published approved unarchived real properties, plus published content. Inventory errors fail rather than silently publishing a partial successful inventory sitemap. No fabricated modification dates.
- Account, admin, API, auth, login, password recovery and offline routes retain noindex headers after launch. Account/admin/auth pages also keep their existing noindex metadata and authentication protections. Private pages never inherit a homepage canonical.
- Privacy/terms remain draft and excluded from sitemap with noindex metadata/headers even after the public launch switch is enabled. Actual reviewed replacements must be published before removing their draft exclusions in `lib/seo.ts`.
- Noncanonical hosts receive noindex headers, including Worker preview domains. The www host redirects permanently to the HTTPS non-www canonical host, preserving paths/query strings. Confirm www DNS/TLS is routed before relying on that redirect. HTTP-to-HTTPS enforcement remains an edge/DNS deployment check.
- Public responses wait for metadata and missing-page resolution before streaming; loading screens are scoped to account/admin routes to avoid successful HTTP responses for missing public pages.
- Preview branding notices disappear only when indexing is approved; no claim of business approval is made while the launch gate is closed.

Robots disallow is crawl guidance, not authentication or a guarantee that a previously discovered URL cannot appear in search. Private routes remain protected by authentication and noindex. Do not use robots changes to expose protected documents or account data.

## Remaining before public indexing

1. Review the actual homepage, company story, published listings, contact details, media permissions and empty public sections with MICMU. Verify the phone/address/email in Company settings before relying on structured data. No live inventory/contact verification was possible here.
2. Replace the draft privacy notice and terms with approved complete text. Their current source still explicitly describes them as preliminary. Remove the draft exclusions only when these actual pages have been updated and reviewed.
3. Complete the applicable business/functional launch checks in `LAUNCH_CHECKLIST.md`; this SEO audit does not certify backup restoration, notification delivery or other operational work.
4. Confirm Cloudflare build-time and runtime variables agree: `NEXT_PUBLIC_SITE_URL=https://micmuproperties.com.ng` and, when the above work is complete, `MICMU_LAUNCH_APPROVED=true`. Update the tracked Wrangler launch value as well as any dashboard build/runtime override and rebuild/redeploy. Merely changing a runtime variable can leave old build-time noindex headers/static metadata in place. The canonical SEO identity is pinned to the official domain; the SITE_URL environment variable still matters to authentication emails and other non-SEO application features.
5. On the actual domain, confirm HTTPS home/public pages return 200 and no `noindex` meta/header, canonicals use the official domain, www and HTTP redirect correctly, robots allows public crawling, sitemap returns populated XML, missing pages return 404, and protected pages still require login and return noindex. Check at least one real published property and one content detail page. Inspect Cloudflare response/transform rules and caching if headers disagree with the release.
6. Validate the homepage JSON-LD using Google's Rich Results Test and/or Schema.org validator. Organization markup does not guarantee a rich result. Check Search Console live URL inspection for crawl/index eligibility.

Do not submit the empty pre-launch sitemap or request indexing while the launch gate is closed. Search Console ownership verification can be completed now; verification alone does not enable indexing.

## Search Console verification (DNS recommended)

1. Open https://search.google.com/search-console and sign in with the intended company Google account or an explicitly authorised developer account. Search Console permissions are separate from MICMU website staff roles. Keep company ownership/access independent of the developer.
2. Select **Add property → Domain**. Enter `micmuproperties.com.ng` with no protocol or path.
3. Copy the exact TXT verification value Google supplies (`google-site-verification=...`). This value is unique: do not invent it.
4. Open the domain's authoritative DNS provider. If Cloudflare manages the nameservers, use **Cloudflare → domain → DNS → Records → Add record**: Type TXT, Name `@`, Content the exact value, TTL Auto. Otherwise add it at the current authoritative DNS provider. Add a new record; do not overwrite mail/SPF/DKIM or other verification records.
5. Save, return to Search Console and select **Verify**. If not found yet, wait for DNS propagation and retry. Keep the TXT record after verification. Do not change nameservers simply to verify ownership.
6. If another person needs access, use Search Console **Settings → Users and permissions** and grant the intended access deliberately. Do not remove the company's existing owners or tokens.

If DNS access is unavailable, an HTTPS URL-prefix property supports HTML tag/file verification. Ask for Google's exact verification tag/file so it can be added through a reviewed deployment; do not share account passwords or login codes.

## Submit the sitemap after the launch checks pass

1. Select the verified `micmuproperties.com.ng` property.
2. Open **Sitemaps** and submit `https://micmuproperties.com.ng/sitemap.xml` (or `sitemap.xml` if the interface already supplies the site prefix).
3. Check that the report says **Success**. If it says Couldn't fetch, inspect HTTPS, robots, launch flags, response status and edge rules before resubmitting.
4. Use **URL inspection** for the homepage, then **Test live URL**. Confirm crawling/indexing is allowed and the declared canonical is correct; choose **Request indexing** when eligible. Repeat for a few important public pages/real listings, not account/admin URLs.
5. Monitor **Page indexing**, **Sitemaps** and **Performance**. Google decides whether/when to index a page; submission does not guarantee indexing or ranking.

Official guidance: [ownership verification](https://support.google.com/webmasters/answer/9008080), [sitemap submission](https://support.google.com/webmasters/answer/7451001).
