# Password-save follow-up — 2026-10-31

The company reached `/reset-password` after activating Resend SMTP and saving the recovery template. Password saving still failed with the previous catch-all message, including after trying a different password. A subsequent sanitized Auth log screenshot confirmed the cause: `PUT /user` returned “AAL2 session is required to update email or password when MFA is enabled.” The earlier recovery verification succeeded. The later token-not-found event is separate from those password-update failures.

The password-update route now exposes only allowlisted support codes and fixed, actionable text. Arbitrary provider messages, error names, request bodies, passwords and session credentials are never returned or logged. Invalid sessions are rejected before password update. Policy errors permit correction in the existing session rather than incorrectly requiring another email. Network/unknown failures remain generic and carry only `password_update_failed`.

The route now checks verified factor enrollment on the server-validated user and requires an AAL2 session before submitting a password update. Enrollment is never inferred from editable user metadata. If Supabase returns `insufficient_aal`, the password form offers the existing authenticator flow at `/dashboard/security?next=reset-password`. A successful challenge returns to the password form using the upgraded session. No MFA checks are bypassed, no factor is removed, and return navigation is fixed to an internal path. Other error categories retain distinct safe responses. The real account still needs its authenticator challenge; the application does not remove or bypass that requirement.

Validation:

- `npm test`: **142 passed**.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Standalone Next.js production build (webpack): passed.
- Cloudflare packaging: run from the standalone output with `npx opennextjs-cloudflare build --skipNextBuild`.
- Real installed Supabase SSR SDK integration with synthetic provider responses: rejection, safe error classification, recovery-cookie retention, MFA challenge/session upgrade and subsequent password save without another OTP verification.

Production follow-up: use `/dashboard/security?next=reset-password` in the same browser, verify the existing authenticator, then return to `/reset-password` and save the new password. Do not reopen the already-consumed email link. Do not export the full Auth log, URL, body, cookies, password, OTP or tokens. No private production account or credential was inspected by this environment.
