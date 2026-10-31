# Staff access validation — 2026-10-31

- `npm test`: **92 passed**, including PostgreSQL/PGlite migration and permission tests and staff API tests.
- `npm run typecheck`: passed.
- `npm run lint`: passed. An existing referral-code effect lint error was corrected using React's external-store subscription API while preserving the editable referral field.
- `npx playwright test tests/e2e/staff.spec.ts`: **2 passed** (desktop and mobile), against a local production server without a Supabase connection. Verified private-route redirection, no staff controls without a session, cross-origin rejection and no account data in the unconfigured endpoint response.
- Production Next.js build and OpenNext Cloudflare Worker packaging: passed using the commands below. The environment blocks Turbopack's local-port operation, so the supported webpack compiler was used for local validation; repository deployment commands were not changed.

```sh
NEXT_PRIVATE_STANDALONE=true NEXT_PRIVATE_OUTPUT_TRACE_ROOT="$PWD" npx next build --webpack
npx opennextjs-cloudflare build --skipNextBuild
```

The migration was tested against populated tables with existing administrator/realtor roles and Supabase-style grants. Tests cover direct RPC authorization, AAL1 denial, confirmed/active target eligibility, owner protection including login deletion and TRUNCATE, grant/revoke idempotency, preservation of realtor roles, immediate loss of database administration after revocation, actor/target audit events and rollback when audit insertion fails. Public team content does not grant permissions. Bootstrap tests reject the unresolved email placeholder and a replacement owner.

No live Supabase migration, owner assignment or production permission mutation was performed. Owner identification and live authenticated owner/grantee/realtor checks remain activation steps. Browser smoke tests cover the unauthenticated/unconfigured path; they do not claim an authenticated production owner session was exercised.
