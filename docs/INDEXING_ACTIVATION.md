# Public indexing activation — 10 November 2026

The user explicitly requested proceeding with public indexing using the uploaded interim documents, with later revisions when the client supplies final wording. This records permission to enable crawling; it does not certify legal review, retention policies, registered-entity verification, or completion of the earlier operational checklist.

Production public indexing is enabled in `lib/launch-config.json` and Wrangler. Build and runtime use the same production default when no environment override is set. `MICMU_LAUNCH_APPROVED=false` remains an explicit kill switch; a dashboard build/runtime override can still keep indexing closed. Non-production defaults, demo mode and noncanonical hosts remain excluded.

Private account/admin/auth/API routes retain noindex protection and authentication. Interim `/privacy` and `/terms` retain their review labels, noindex directives and sitemap exclusions. No business name, contact value, payment plan/rate or legal document was altered by activation. Unresolved decisions remain documented in the separate owner review materials; earlier documents describing indexing as disabled are historical.

After deployment, use Search Console to test the homepage live. If Google still reports blocked robots/noindex, inspect Cloudflare build/runtime overrides and edge rules before requesting indexing. Once the live test allows indexing, submit `https://micmuproperties.com.ng/sitemap.xml`, then request homepage indexing. Google decides whether and when to index URLs.
