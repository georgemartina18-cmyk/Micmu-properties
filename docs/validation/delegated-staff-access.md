# Delegated staff access validation — 2026-11-04

Owner-approved delegation adds a separate staff-manager permission. It preserves the immutable company owner, existing roles and audit history. No migration automatically appoints an account. The targeted database setup separately verifies the approved developer and existing owner before inserting delegation.

Validation passed:

- `npm test`: 160 tests across 11 files, including PostgreSQL/PGlite migration, permission boundaries, MFA, audit rollback, idempotent grants, protected roles, immediate revocation and guarded developer setup.
- `npm run typecheck` and `npm run lint`.
- Standalone production build: `NEXT_PRIVATE_STANDALONE=true NEXT_PRIVATE_OUTPUT_TRACE_ROOT=/workspace/Micmu-properties npx next build --webpack`.
- Cloudflare packaging: `npx opennextjs-cloudflare build --skipNextBuild`.
- `npx playwright test tests/e2e/staff.spec.ts`: desktop and mobile both passed against the unconfigured production server, verifying unauthenticated access boundaries.
- `git diff --check`.

The managed environment has no configured Supabase credentials. These checks do not prove live database activation, owner/developer MFA enrollment, or a signed-in production grant. Apply the delegation migration and approved developer setup separately in the project's Supabase SQL Editor, then verify the developer's own MFA session at `/admin/staff`. Existing password recovery and signup confirmation code is unchanged.
