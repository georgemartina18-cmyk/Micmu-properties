# Password-save follow-up — 2026-10-31

The company reached `/reset-password` after activating Resend SMTP and saving the recovery template. Password saving still failed with the previous catch-all message, including after trying a different password. This establishes a separate password-update failure; the exact live provider code is not yet available. Do not infer an MFA or password-policy cause solely from that message.

The password-update route now exposes only allowlisted support codes and fixed, actionable text. Arbitrary provider messages, error names, request bodies, passwords and session credentials are never returned or logged. Invalid sessions are rejected before password update. Policy errors permit correction in the existing session rather than incorrectly requiring another email. Network/unknown failures remain generic and carry only `password_update_failed`.

If Supabase returns `insufficient_aal`, the password form offers the existing authenticator flow at `/dashboard/security?next=reset-password`. A successful challenge returns to the password form using the upgraded session. No MFA checks are bypassed, no factor is removed, and return navigation is fixed to an internal path. Other error categories are reported accurately for the next diagnosis step; this change does not claim to have observed which category the live account produces.

Validation:

- `npm test`: **140 passed**.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Standalone Next.js production build (webpack): passed.
- Cloudflare packaging: run from the standalone output with `npx opennextjs-cloudflare build --skipNextBuild`.
- Real installed Supabase SSR SDK integration with synthetic provider responses: rejection, safe error classification, recovery-cookie retention, MFA challenge/session upgrade and subsequent password save without another OTP verification.

Production follow-up: refresh the existing clean `/reset-password` page, submit once and report only the displayed support code, or the short code from the failed Auth `PUT /user` event. Do not export the full Auth log, URL, body, cookies, password, OTP or tokens. No private production account or credential was inspected by this environment.
