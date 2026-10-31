import { z } from "zod";

// Credentials are opaque. Never include input values in errors or diagnostics.
const credential = z
  .string()
  .min(1)
  .max(2048)
  .regex(/^[A-Za-z0-9._~-]+$/);
export const confirmationSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("otp"),
      token_hash: credential,
      type: z.enum(["signup", "recovery", "email"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("pkce"),
      code: credential,
      flow_id: z
        .string()
        .regex(/^[A-Za-z0-9_-]{1,128}$/)
        .optional(),
      recovery: z.boolean(),
    })
    .strict(),
]);
export type Confirmation = z.infer<typeof confirmationSchema>;
export type ConfirmationLink =
  { input: Confirmation } | { error: "expired" | "invalid" };

export function readConfirmationLink(href: string): ConfirmationLink {
  const url = new URL(href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const query = url.searchParams;
  // Never mix credentials from two sources or choose between two verifiers.
  const hasCredentials = (p: URLSearchParams) =>
    p.has("token_hash") ||
    p.has("code") ||
    p.has("access_token") ||
    p.has("refresh_token");
  if (hasCredentials(fragment) && hasCredentials(query))
    return { error: "invalid" };
  const p =
    hasCredentials(fragment) || fragment.has("error") ? fragment : query;
  if (p.has("error") || p.has("error_code"))
    return {
      error: p.get("error_code") === "otp_expired" ? "expired" : "invalid",
    };
  if (p.has("access_token") || p.has("refresh_token"))
    return { error: "invalid" };
  if (p.has("code") && p.has("token_hash")) return { error: "invalid" };
  if (
    ["code", "token_hash", "type", "sb_flow_id"].some(
      (key) => p.getAll(key).length > 1,
    )
  )
    return { error: "invalid" };
  const candidate = p.has("token_hash")
    ? { kind: "otp", token_hash: p.get("token_hash"), type: p.get("type") }
    : {
        kind: "pkce",
        code: p.get("code"),
        ...(p.has("sb_flow_id") ? { flow_id: p.get("sb_flow_id") } : {}),
        recovery:
          p.get("type") === "recovery" || p.get("next") === "/reset-password",
      };
  const result = confirmationSchema.safeParse(candidate);
  return result.success ? { input: result.data } : { error: "invalid" };
}
