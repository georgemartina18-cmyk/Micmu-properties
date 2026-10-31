# Password recovery validation — 2026-10-31

- `npm test`: **117 passed** across 10 files.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npx playwright test tests/e2e/recovery.spec.ts`: **8 passed**, desktop and mobile, against the local production build with synthetic credentials only.
- Production standalone webpack build and OpenNext Cloudflare Worker packaging: passed.

```sh
NEXT_PRIVATE_STANDALONE=true NEXT_PRIVATE_OUTPUT_TRACE_ROOT="$PWD" npx next build --webpack
npx opennextjs-cloudflare build --skipNextBuild
```

Coverage includes exact one-verifier selection, error/replay handling without fallback or logging, reset request errors, explicit recovery redirects and PKCE flow IDs. Integration tests use the real installed Supabase SSR client with a simulated provider to verify session cookie writes, password update without token reverification, and reset-request PKCE cookie selection. Browser tests cover inert GET/HEAD/prefetch/reload, URL scrubbing, double-submit prevention, safe error display and recovery routing. They do not use real mail accounts, credentials or live Supabase sessions.

The company confirmed the existing Reset Password template uses `{{ .ConfirmationURL }}`. Saving the supplied replacement template is a required external activation step; a git deployment cannot update Supabase email templates. No live reset request or actual token was collected or verified. The environment's outbound policy blocks the official domain, so an end-to-end production mail test remains unverified. Cloudflare deployment status can be checked independently through its GitHub check run.
