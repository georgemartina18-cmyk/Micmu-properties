import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { database } from "@/lib/supabase";
import { hasSecondFactor } from "@/lib/assurance";
import { sameOrigin } from "@/lib/request";

const schema = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("lookup"), email: z.email().trim().max(254) })
    .strict(),
  z.object({ action: z.literal("grant"), user: z.uuid() }).strict(),
  z.object({ action: z.literal("revoke"), user: z.uuid() }).strict(),
]);
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "Request not allowed." }, 403);
  const db = await database();
  if (!db) return json({ error: "Staff access is unavailable." }, 503);
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();
  if (authError || !user) return json({ error: "Sign in first." }, 401);
  if (!(await hasSecondFactor(db)))
    return json({ error: "Verify MFA in Account security first." }, 403);
  const { data: owner, error: ownerError } = await db.rpc("is_company_owner");
  if (ownerError || owner !== true)
    return json(
      { error: "Only the designated company owner can manage staff access." },
      403,
    );
  const raw = await req.text();
  if (raw.length > 2000) return json({ error: "Request too large." }, 413);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    return json({ error: "Check the email or account selection." }, 400);
  const b = parsed.data;
  if (b.action === "lookup") {
    const { data, error } = await db.rpc("find_staff_account", {
      p_email: b.email,
    });
    if (error)
      return json(
        { error: "Account lookup failed. No changes were made." },
        400,
      );
    if (!Array.isArray(data) || data.length !== 1)
      return json(
        { error: "No eligible confirmed account found for that email." },
        404,
      );
    return json({ account: data[0] });
  }
  // Use the caller's authenticated session, never the service credential.
  // The RPC repeats owner/MFA/target checks and commits its audit atomically.
  const { data, error } = await db.rpc("set_staff_administrator", {
    p_user: b.user,
    p_grant: b.action === "grant",
  });
  if (error)
    return json(
      {
        error:
          "Access could not be changed. The account must be confirmed and the owner must retain administrator access.",
      },
      400,
    );
  return json({
    message:
      data === true
        ? `Administrator access ${b.action === "grant" ? "granted" : "revoked"}.`
        : "The account already has the requested access. No change was needed.",
  });
}
