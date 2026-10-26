# Required launch checks

Unchecked work is not certified complete. A green local build is not production approval.

## Business and legal

- [ ] Approved logo, headline, company profile and contact details.
- [ ] Verified live property records and current prices/availability; original authorised media.
- [ ] No fictional samples, unconfirmed divisions, fake statistics or testimonials visible in production.
- [ ] Privacy notice, terms, controller contact, legal basis, retention and complaints process reviewed by Nigerian counsel.
- [ ] Staff enquiry handling and inspection-confirmation process assigned.
- [ ] Domain, resource costs and publication explicitly approved by owner.

## Identity and data

- [ ] Migrations tested on staging Supabase; schema permissions and RLS inspected there.
- [ ] Real two-client isolation tests for profiles, requests, documents, saved properties, payments and realtor records.
- [ ] Confirmed email, login, logout, expired session, refresh, password recovery and token replay tested.
- [ ] Staff MFA enrollment/challenge, application/database assurance-level guard, lost-device recovery and admin-role lifecycle verified against live Supabase.
- [ ] Backups, restoration drill, retention/deletion tools and incident response verified.
- [ ] Document upload/download, assignment and short-lived links tested with multiple accounts.
- [ ] Commission access reviewed; no self-granted roles or client-writable financial fields.

## Forms, files and infrastructure

- [ ] Valid Turnstile keys scoped to actual hostname; replay, timeout and failure checks.
- [ ] Successful enquiries persist before acknowledgement; duplicates do not create another record.
- [ ] Request-body limits enforced by edge infrastructure as well as application validation.
- [ ] WAF/global rate limits for enquiry, auth and verification; email-based DB limit alone is insufficient.
- [ ] Notification/email outbox, provider delivery and retry handling implemented before promising automatic messages.
- [ ] Approved R2 binding configured; file validation, responsive compression, revocation and storage failures tested.
- [ ] Private R2/Storage data never exposed publicly; PDF scanning and image dimension/decompression protections reviewed.
- [ ] HTTPS certificate, redirects, HSTS decision, CSP, cookie settings, error handling and least privilege reviewed.
- [ ] CSP tightened with tested nonces/allowlists for Next hydration, Supabase and Turnstile; current policy protects framing/object/base/form targets but is not a full script allowlist.
- [ ] No shared cache for auth, admin, API, private documents or personalised responses.
- [ ] Live secrets absent from repository, browser bundles, logs and test artifacts.

## Experience and release

- [ ] Desktop and physical Android/iPhone tests; mobile Chromium emulation is not physical-device validation.
- [ ] Keyboard/screen-reader review and WCAG 2.2 AA review across public, account and admin pages.
- [ ] Responsive imagery/real photography tested in Lite Mode and normal mode.
- [ ] Defined Wi-Fi, 4G, slow 4G, 3G, interrupted request and offline scenarios measured in release build.
- [ ] Lighthouse >=90 targets measured and Core Web Vitals reviewed; no scores assumed.
- [ ] Public content metadata/canonical URLs, sitemap, Open Graph, useful structured data and 404 behavior validated on the approved domain.
- [ ] End-to-end real booking, availability change, CMS publishing, R2 upload and private-document tests.
- [ ] Local Worker validation, staging deployment, domain routing and production smoke tests completed separately.
- [ ] `MICMU_LAUNCH_APPROVED` changed only after business, legal, security and functional approval.
