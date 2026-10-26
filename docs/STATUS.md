# Implementation status

**Connection progress:** the owner created a dedicated Supabase project and successfully ran the first-time schema setup. Public Auth/settings and property/content/settings reads, plus the connected homepage/property/login pages, were verified. The owner account has been assigned the admin role. TOTP support is enabled, but personal authenticator pairing and a live owner login test are still pending. Cloudflare deployment, form-submission secrets, Turnstile, R2 and external email delivery remain unconfigured. Historical unconnected-service notes below describe the earlier baseline.

**Client PDF revision:** see [requirement coverage](CLIENT_REQUIREMENTS_REVIEW.md) and [revision validation](validation/client-revision.md). The owner confirmed keeping the existing Cloudflare/Next.js/Supabase technology. The additions listed there supersede the older baseline limitations below; remaining agent/landlord and operational modules are not claimed complete.

This is a working development version and a deployable application foundation, not the entire finished platform described in the master brief. No production system has been changed. Read this before launch.

## Implemented code

| Area                   | Current behavior                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity and public UI | Provisional original identity, responsive homepage/navigation/footer, concept illustration, mobile layouts                                                                                       |
| Public pages           | Company/about, confirmed services, properties, property details, estates, developments, articles, contact, partnerships, inspections, realtor application, FAQs, verification, draft legal pages |
| Marketplace            | Database-backed published listings; location/type/availability/budget/bedroom/text filters; development-only samples; loading/error/empty states                                                 |
| Enquiries              | Server validation, origin check, Turnstile verification, server-only RPC, database save-before-acknowledgement, duplicate prevention, email-based rolling-hour limit                             |
| Account                | Signup, confirmed email callback, login/logout, recovery, profile, saved properties, own inspection/support records, private PDF links, payment records                                          |
| Realtor                | Application review, confirmed-account approval, own read-only referral and commission records                                                                                                    |
| Admin                  | Server role and second-factor checks; property create/edit/publish/withdraw; content editor with publish flags; company settings; enquiry status; media upload; audit list                       |
| Media                  | R2 upload/delivery code; source/permission metadata, MIME/signature and size limits; public/private separation                                                                                   |
| Security               | RLS, restricted submission function, role enforcement, no public service key, no-cache private routes, basic hardening headers, prelaunch noindex                                                |
| Mobile/offline         | Saved Lite Mode, Save-Data hint, reduced motion, no videos/maps/fonts/trackers on first load, public-only offline fallback                                                                       |
| Deployment             | Pinned OpenNext adapter, Wrangler config, local Worker build, setup and owner documentation                                                                                                      |

## External prerequisites not connected

- Supabase project, actual migrations, Auth/SMTP configuration, public build variables and server submission key.
- Turnstile widget and domain-scoped credentials.
- Cloudflare account, approved R2 bucket/binding, domain, routing, WAF/rate limits and production observability.
- Official contact details, business facts, current real inventory and approved media.
- Legal approval and owner approval of costs/publication.

Missing integrations return explicit unavailable states. Successful mocks/local PostgreSQL tests must not be described as live provider validation.

## Remaining implementation, beyond the working foundation

- Full no-code homepage layout composition, draft previews and richer structured property/project content. Homepage text, published team profiles and approved testimonials are now supported.
- Responsive compressed image derivatives, interactive map search, brochures, floor plans and video/Stream processing. Multi-image galleries and on-demand external video/tour/map links are now supported.
- Dedicated inspection rescheduling workflow, staff calendar, notification/email outbox and reliable delivery/retry handling.
- Staff client/user-management interface, secure private-document upload/assignment UI, financial/referral editing and realtor marketing library.
- Realtor self-service referrals, richer application review and application lifecycle notices.
- Live-provider testing of authenticator enrollment, challenge, session upgrade and lost-device recovery. MFA enrollment/challenge UI and both server/database aal2 enforcement are implemented.
- Verification-record management UI, QR issuance/revocation workflow; database supports published active/revoked/expired records.
- Complete legally reviewed privacy/terms, data retention/deletion tooling, security/abuse review and production operations.
- Complete canonical/structured metadata, social imagery and approved-domain SEO review.
- Physical-device checks, comprehensive accessibility review, field Core Web Vitals and live-provider end-to-end tests. An initial local mobile Lighthouse run is recorded in validation; it does not replace those release checks.

Investment transactions, investor portal, AI assistant, automated WhatsApp and Cloudflare Stream remain disabled optional modules. Confirm service legitimacy, legal scope, cost and approval before implementing/activating them. No mobility/investment division is invented.

## Verification

The exact final results are recorded in `validation/` and the completion report. The test suite includes server validation plus actual PostgreSQL migration/RLS tests using PGlite, desktop/mobile Chromium checks and a local Cloudflare Worker smoke/offline/network-emulation script. No production deployment, live Supabase/R2/Turnstile integration or real-device test is claimed. Local Lighthouse scores are recorded with their exact limitations in validation.

## Next sequence

1. Owner supplies approved content and configures Supabase/Turnstile securely; connect staging and test actual account/booking/CMS workflows.
2. Complete the remaining operational interfaces, media pipeline, notifications and staff MFA; integrate authorised originals.
3. Run the full launch checklist, legal/security/performance review and staging deployment.
4. Obtain explicit owner approval for charges/publication, then deploy to the approved Cloudflare domain and smoke-test production.
