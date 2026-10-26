# Architecture and design decisions

## Application

Next.js App Router with React and strict TypeScript. Server components render page information and public records; only navigation, preference controls, forms and admin editors need client JavaScript. Plain CSS design tokens and Tailwind's build integration keep the visual system explicit and lightweight. Native semantic form controls replace heavy form/UI libraries; Zod validates server boundaries. Lucide provides small icons. No motion package is necessary for the restrained interactions.

Design tokens: midnight navy #101D2C, champagne gold #C5A46D, ivory #FAF9F6, forest green #214C40. Georgia/system sans-serif fallbacks avoid a third-party font request. Typography and the provisional wordmark are original design decisions subject to owner approval. Architectural illustration is authored for this project and labeled as concept imagery. No reference-site assets or text were copied.

Public content is plain text rendered through React escaping, not untrusted HTML. Services, estates, developments, articles and FAQ records share an administrator-managed content table with explicit publish flags. Unknown business divisions are not seeded. About/profile/contact content comes from approved site settings. Missing information is stated explicitly.

## Cloudflare decision

Next.js 16.4.3 and @opennextjs/cloudflare 1.20.13 were selected after checking package registry metadata. The adapter declares compatibility with Next >=16.4.1; Node 24 satisfies the toolchain. vinext 1.3.1 exists, but its current compatibility documentation could not be accessed here. OpenNext was selected for a documented package compatibility contract and a testable Worker artifact, not on an unverified claim that it is Cloudflare's only recommended adapter. Official web documentation was blocked by the network proxy. Recheck official guidance before production rollout.

Wrangler runs the generated Worker; `nodejs_compat` is enabled. No Vercel configuration is used. R2 binding is intentionally absent until a real bucket is approved and created. R2 implementation uses the platform binding, not hardcoded access keys. Supabase provides PostgreSQL, Auth and private PDF storage; private documents are kept outside the public R2 media bucket.

## Data and permissions

Supabase publishable key is public by design. Request-scoped server clients use cookies and database RLS. `getUser()` validates sessions server-side. Next proxy refreshes cookies on protected/auth/API routes. Administrator routes require both an admin role and an aal2 authenticator session; database policies enforce the same restriction. The account security page implements TOTP enrollment and challenge/verification. Live provider testing and an owner-controlled recovery process are still required.

A separate server-only Supabase secret key calls the enquiry RPC only after input, origin and Turnstile checks. Anonymous/authenticated public keys cannot call that RPC. The server supplies the verified caller id. Deduplication uses a UUID request id plus email hash; repeats do not change ownership. Transaction-scoped advisory locking makes the per-email rolling-hour limit consistent under concurrency. This is not a complete global bot limit; configure Cloudflare WAF/rate limits before launch.

Tables: profiles, user_roles, properties, content, site_settings, enquiries, saved_properties, client_documents, payment_records, referrals, commissions, verification_records, media_assets and audit_logs. Estates/developments/news/businesses are content types; realtor applications/inspection bookings/partnerships/support are enquiry types. No investor transaction schema is activated.

Audit rows record actor, action, table and record id, without copying full private payloads. Ordinary users cannot write audit records, grant roles or change commissions. Initial admin bootstrap is a deliberate database-owner operation documented separately.

## Performance and offline scope

No external fonts, map SDKs, autoplay videos or analytics scripts are downloaded on page load. Public listing responses are current server requests, not a public cached price feed. The service worker caches only the offline fallback and owned illustration; private paths and APIs are excluded. Offline navigation presents a warning instead of old prices. Requests are never silently queued.

Lite Mode removes decorative image backgrounds, animations and transitions; it retains property facts and forms. A saved local preference and browser Save-Data hint are read before normal client hydration. Auth/session cookies are separate from that preference.

Approved image upload is limited to JPEG/PNG/WebP and 5 MB with MIME and signature checks. Current public delivery uses the uploaded image; responsive transformations and compression are a remaining production requirement. Do not treat file signatures alone as a complete image malware/dimension assessment. No video upload/Stream workflow is enabled.

Initial budgets: owned illustration <10 KB; no third-party requests on an unconfigured homepage; target compressed initial page + critical assets <250 KB and listing thumbnails <50 KB after production image pipeline integration. These are budgets, not measured achievements. A release audit must measure transfer size, Core Web Vitals and Lighthouse under defined network/CPU conditions.

## Toolchain security pins

The final Wrangler version is 4.152.0 (compatible with the adapter's ^4.148.0 peer requirement). Package overrides pin `@node-minify/core`'s `glob` to 10.5.0 and Miniflare's `undici` to 7.30.1 to address registry-reported vulnerabilities without downgrading the adapter or disabling verification. These are compatible-major tooling updates, captured in the lockfile and validated with the local Worker. The final `npm audit` reported zero known vulnerabilities; that result is time-specific, not a guarantee against future advisories.
