# Password recovery diagnosis and rollout

## Findings

The report was fresh emails producing `otp_expired` / “One-time token not found”, with a 3600-second Email OTP lifetime and the official domain already in the Site URL and redirect allowlist. The company confirmed the Reset Password template links directly to `{{ .ConfirmationURL }}`. That URL reaches Supabase's verification endpoint before reaching the app. A token-not-found response establishes that the supplied one-time token is unavailable; it does not establish why. Previous use, a newer reset superseding an older one, provider link rewriting, and GET prefetching are distinct possibilities. No actual recovery credentials or private provider logs were collected.

Source inspection found:

- `/auth/confirm` consumed OTP hashes or PKCE codes on GET. Repeated navigation or a prefetch could therefore attempt verification. Its two branches were mutually exclusive: no evidence of two verification methods running within one callback.
- PKCE callbacks commonly contain a code without `type=recovery`. The previous handler sent those sessions to `/dashboard`, rather than the password editor. It also ignored the installed SDK's `sb_flow_id` parameter, which selects a flow-specific verifier cookie.
- Reset requests discarded Supabase errors and always displayed the generic sent-instructions message.
- The SSR client disables automatic URL detection; no competing browser Supabase auth client was found. The service worker already excludes auth/API/reset routes from its cache.

These are confirmed code findings, not proof that a mail scanner caused the reported production failures. No expiry increase or database migration is required.

## Fix

The confirmation GET is now an inert page. The browser captures the credential in memory, removes it from its address/history and waits for an explicit button press. Only a same-origin POST verifies it, using exactly one method with no fallback or automatic retry. A synchronous submission guard prevents duplicate browser submissions. The password-reset request form also guards concurrent submissions. PKCE callbacks retain the flow ID and recovery destination. SDK errors are never logged or reflected; responses contain only fixed messages and fixed same-origin destinations. Sessions remain cookie-based through the real Supabase SSR client.

The reset template must also change: modifying the app callback alone cannot stop the first verification at a direct Supabase `ConfirmationURL`. Use [the supplied template](email-templates/reset-password.html). Its link is:

```html
<a
  href="{{ .SiteURL }}/auth/confirm#token_hash={{ .TokenHash }}&amp;type=recovery"
  >Reset password</a
>
```

The fragment stays in the browser and is not sent with the initial HTTP request. The app supports legacy query callbacks too, but new templates should use the fragment. Do not combine a direct `ConfirmationURL` with an app OTP verification link, and do not substitute `.Token` for `.TokenHash`. Disable mail-provider click tracking that rewrites authentication links. GET-only mail previews can open the new landing page without consuming its credential; this is not a claim that every possible scanner behaves identically.

Auth pages and confirmation responses are private/no-store and no-referrer. Worker automatic invocation logs are disabled to avoid recording credentials in old query-format URLs; application logging elsewhere remains enabled. This does not retroactively remove historical logs or configure external mail/proxy logging. Do not enable SDK debug logging, request-body logging, browser traces or URL screenshots while testing actual emails.

## Activation

1. Deploy this source to the existing Cloudflare Worker. No role, owner or company-content changes are part of this fix.
2. In Supabase **Authentication → Email Templates → Reset Password**, replace the body with `docs/email-templates/reset-password.html`. Keep the existing subject if desired. Confirm the Site URL remains `https://micmuproperties.com.ng`. This setting is outside the repository and cannot be changed by a git deployment.
3. Ensure the allowed callbacks cover the recovery redirect `/auth/confirm?next=/reset-password`, including the SDK-added `sb_flow_id` query when applicable. Keep the exact official HTTPS origin; no broad external wildcard is required.
4. Request one fresh email. On the official domain, opening it should show **Continue securely**. Only pressing that button should establish the recovery session and open **Choose a new password**. Save the password and verify normal sign-in yourself. Never send the link, token, code, cookie or password to support/chat.
5. Reopening an already-used link must fail safely. Use only the most recent email after another reset request. To investigate any remaining pre-click consumption, compare sanitized event timestamps, endpoint paths, request counts and user-agent categories against the user's click time. Do not export request URLs, query strings, bodies, access tokens or recovery credentials.

The environment has no Supabase management connection, so the template must be saved in the company's dashboard. The official domain is blocked by the execution network policy; production browser verification cannot be claimed from this environment. The GitHub Cloudflare Workers check can still confirm the build/deployment result for the pushed commit.

## Validation

- Unit tests cover mutually exclusive verification, expired/replayed credentials, malformed input, no fallback/retry, safe error responses, same-origin checks, reset delivery errors, fixed destinations and legacy/fragment parsing.
- Integration tests use the real installed Supabase SSR SDK with an entirely synthetic provider. They verify PKCE flow-cookie selection, recovery-session cookie persistence and password update without a second OTP verification.
- Desktop/mobile Playwright tests use synthetic credentials only. They cover GET/HEAD/reload/prefetch, explicit confirmation, duplicate-submit prevention, URL scrubbing, recovery routing and safe provider-error handling.

References: [Supabase email-template variables, prefetching and tracking](https://supabase.com/docs/guides/auth/auth-email-templates), [password-based recovery](https://supabase.com/docs/guides/auth/passwords). The installed SDK source was inspected for SSR initialization and PKCE flow identifiers.
