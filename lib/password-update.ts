// Only allowlisted, non-sensitive provider codes may reach the browser.
// Never expose/log the provider message, request body, session or password.
const failures: Record<
  string,
  { error: string; action?: "verify_mfa"; status: number }
> = {
  same_password: {
    error: "Choose a password different from your current password.",
    status: 400,
  },
  weak_password: {
    error:
      "Supabase rejected this password under the account password policy. Use a longer unique password with uppercase and lowercase letters, a number and a symbol.",
    status: 400,
  },
  insufficient_aal: {
    error:
      "Verify your existing authenticator before saving your new password. Keep MFA enabled.",
    action: "verify_mfa",
    status: 403,
  },
  reauthentication_needed: {
    error:
      "Supabase requires an additional email security confirmation before this password can be changed.",
    status: 403,
  },
  reauth_nonce_missing: {
    error:
      "Supabase requires an additional email security confirmation before this password can be changed.",
    status: 403,
  },
  reauthentication_not_valid: {
    error: "The additional email security confirmation is invalid or expired.",
    status: 403,
  },
  session_not_found: {
    error:
      "Your recovery session is no longer valid. Request a fresh recovery email.",
    status: 401,
  },
  session_expired: {
    error: "Your recovery session has expired. Request a fresh recovery email.",
    status: 401,
  },
  refresh_token_not_found: {
    error:
      "Your recovery session is no longer valid. Request a fresh recovery email.",
    status: 401,
  },
  refresh_token_already_used: {
    error:
      "Your recovery session is no longer valid. Request a fresh recovery email.",
    status: 401,
  },
  bad_jwt: {
    error:
      "Your recovery session could not be verified. Request a fresh recovery email.",
    status: 401,
  },
  user_banned: {
    error: "This account is restricted. Contact MICMU account support.",
    status: 403,
  },
  user_sso_managed: {
    error:
      "This account uses company-managed sign-in. Contact your account administrator.",
    status: 403,
  },
  over_request_rate_limit: {
    error: "Too many attempts. Wait a few minutes before trying again.",
    status: 429,
  },
  request_timeout: {
    error: "The password service timed out. Wait a moment, then try again.",
    status: 503,
  },
  unexpected_failure: {
    error:
      "The authentication service could not complete the password change. Contact MICMU support with the support code shown.",
    status: 503,
  },
};
export function passwordUpdateFailure(value: unknown) {
  const candidate =
    value && typeof value === "object" && "code" in value
      ? value.code
      : undefined;
  const code =
    typeof candidate === "string" && Object.hasOwn(failures, candidate)
      ? candidate
      : "password_update_failed";
  const failure = failures[code] ?? {
    error:
      "Password saving failed. Contact MICMU support with the support code shown; do not share your password or recovery link.",
    status: 503,
  };
  return { ...failure, error: `${failure.error} Support code: ${code}.`, code };
}
