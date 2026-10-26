# Client PDF review and website changes

Source: owner-supplied `CLIENT_REQUIREMENTS.pdf` (kept locally and excluded from GitHub source uploads) — “PHP/MYSQL REAL ESTATE PLATFORM”. The uploaded proposal is requirements input, not permission to deploy, incur costs, replace the platform, or accept contractual terms.

## Confirmed decision

The project owner selected **keep the existing technology and add the features**. Continue with Next.js/React, Supabase PostgreSQL/Auth and Cloudflare Workers/OpenNext. PHP/MySQL is not being introduced. The proposal's “2–4 weeks”, billing exclusions and support terms have not been accepted as commitments.

The PDF refers to an “HTML package” but that package was not provided. Its unspecified contents cannot be inferred. The existing MICMU master brief remains the authenticity, brand, Cloudflare and low-data reference.

## Changes in this revision

- Separate sale/rental purpose; total/monthly/yearly pricing; Rented status; furnishing and property listing date.
- State → LGA → city/town → area fields. Dependent search choices derive from actual published records. This is not an imported or invented full Nigerian location directory.
- Filters for purpose, location hierarchy, bathrooms, furnishing, date and property features, in addition to existing category, availability, budgets and bedrooms. Sorting includes featured/newest and price.
- Administrator feature/review controls, approval required before publishing, safe archival and restore-as-draft.
- Featured/latest homepage sections, sale/rental browsing and published-location links.
- Additional approved gallery images, click-through video and virtual tour links, and optional coordinate-based map/directions links. No automatic video, map SDK or embedded tour downloads.
- Save searches, remove favourites, device-only recently viewed history and its clear-history control.
- Private dashboard notifications for saved-property changes, customer request status changes and new requests for staff. Read status is editable only by the notice owner. These are not email/SMS/WhatsApp sends or real-time push alerts.
- Property-specific contact enquiries and preferred contact method.
- Editable homepage headline/introduction copy; approved testimonials and team profile content. Empty testimonial/team sections remain hidden. No reviews, names or company claims are invented.
- Additive migrations 003, 004 and 005. Earlier migration files remain intact. New migrations are tested locally, not applied to any live Supabase project.

## Requirement coverage and remaining scope

| PDF area              | Current coverage                                                                                                                       | Still required                                                                                                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public homepage       | Responsive design, dynamic featured/latest, sale/rent links, search, locations, approved testimonials and company/homepage copy        | Full banner/layout editor and approved photography                                                                                                                                                                           |
| Advanced search       | Listed filters, hierarchical location facets, sorting and URL sharing                                                                  | A curated full Nigerian location catalogue if required; large-inventory server pagination/search optimisation                                                                                                                |
| Property management   | Create/edit/publish/unpublish, review/approve/reject, feature, sold/rented/available, archive/restore, galleries, media/tour/map links | Agent assignment, category/location management tools, richer floor-plan/document workflows                                                                                                                                   |
| Admin dashboard       | Existing totals, request queue and audit log                                                                                           | Agent/client counts, property view analytics, status summaries, recent registration views                                                                                                                                    |
| Users                 | Secure accounts, profile editing, admin/realtor roles, admin MFA                                                                       | Staff user creation/edit/suspension/deletion and full role administration UI                                                                                                                                                 |
| Agent/landlord portal | Existing realtor application/approval and read-only referral/commission portal                                                         | An independent approved agent/landlord listing portal, ownership policies, property submissions/reviews, assigned lead replies and performance reporting. Do not describe the current realtor portal as this finished portal |
| Client/tenant portal  | Account, search, favourites/removal, saved searches, recent history, own inspection/support records and dashboard notifications        | Complete enquiry history, agent contact/routing and richer tenant-specific functions                                                                                                                                         |
| Inspection system     | Request, pending/confirmed/completed/cancelled statuses and dashboard status notices                                                   | Agent assignment, reliable external notification delivery, dedicated rescheduling/calendar workflow                                                                                                                          |
| Favourites            | Add/remove, own shortlist and dashboard notices on status/price/publication change                                                     | External alerts and configurable notification preferences                                                                                                                                                                    |
| Enquiries             | Saved requests, admin status control, property reference and contact preference                                                        | Staff/agent reply conversation history and assignment                                                                                                                                                                        |
| Notifications         | Database-backed owner-private dashboard notices                                                                                        | Email provider/outbox/retries, new-property/saved-search alerts, registration and account notices; SMS/WhatsApp only after approval                                                                                          |
| CMS                   | Company/homepage copy, services, FAQs, articles, approved testimonials and team profiles                                               | Banners, per-record SEO controls and advanced draft previews                                                                                                                                                                 |
| News/blog             | Basic create/edit/draft/publish and article routes                                                                                     | Categories/tags/search, approved featured images and archive/delete tools                                                                                                                                                    |
| Maps/media            | Approved image gallery, optional coordinates, on-demand external map, video and tour links                                             | Interactive map search/nearby information, responsive image derivatives, video processing/Stream and floor plans                                                                                                             |
| SEO/marketing         | Existing titles/descriptions, robots, sitemap and prelaunch noindex                                                                    | Full canonical/structured data/social imagery review, domain Search Console and privacy-approved analytics                                                                                                                   |
| Security/deployment   | Existing session checks, admin MFA, RLS, file validation, security headers and Worker configuration                                    | Live-provider tests, backups/recovery, WAF, legal/retention process, production security review and owner-approved deployment                                                                                                |
| Future expansion      | Kept out of public offers                                                                                                              | Payments, subscriptions, mobile API/app, tenancy/maintenance and digital agreements are separate future features                                                                                                             |

## Provider and content prerequisites

Supabase, Turnstile, approved R2 storage, company contacts, authentic inventory and approved media remain unconfigured/unprovided. Functional code and local tests do not establish a live connection. Keep launch indexing disabled and do not publish sample properties as real inventory.

## Validation

See `validation/client-revision.md` for this revision's checks. Earlier Lighthouse/Worker measurements in this repository are baseline evidence and must not be assumed to certify changed pages.
