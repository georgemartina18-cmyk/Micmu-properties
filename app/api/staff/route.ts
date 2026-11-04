import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { database } from "@/lib/supabase";
import { hasSecondFactor } from "@/lib/assurance";
import { staffAccessPermission } from "@/lib/staff-access";
import { sameOrigin } from "@/lib/request";

const schema = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("lookup"), email: z.email().trim().max(254) })
    .strict(),
  z.object({ action: z.literal("grant"), user: z.uuid() }).strict(),
  z.object({ action: z.literal("revoke"), user: z.uuid() }).strict(),
  z.object({ action: z.literal("grant-manager"), user: z.uuid() }).strict(),
  z.object({ action: z.literal("revoke-manager"), user: z.uuid() }).strict(),
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
  const permission = await staffAccessPermission(db);
  if (!permission.allowed)
    return json(
      {
        error:
          "Company owner or delegated staff-access-manager permission is required.",
      },
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
    let isManager = false;
    if (permission.delegationReady) {
      const { data: manager, error: managerError } = await db
        .from("staff_access_managers")
        .select("user_id")
        .eq("user_id", data[0].user_id)
        .maybeSingle();
      if (managerError)
        return json({ error: "Account permissions could not be loaded." }, 503);
      isManager = Boolean(manager);
    }
    return json({ account: { ...data[0], is_access_manager: isManager } });
  }
  if (b.action === "grant-manager" || b.action === "revoke-manager") {
    if (!permission.isOwner || !permission.delegationReady)
      return json(
        {
          error:
            "Only the company owner may appoint or remove staff access managers.",
        },
        403,
      );
    const { data, error } = await db.rpc("set_staff_access_manager", {
      p_user: b.user,
      p_grant: b.action === "grant-manager",
    });
    if (error)
      return json(
        {
          error:
            "Delegation could not be changed. Grants require a confirmed active administrator; the owner remains protected.",
        },
        400,
      );
    return json({
      message:
        data === true
          ? "Staff-access-manager permission updated."
          : "No change was needed.",
    });
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
          "Access could not be changed. The account must be confirmed and owners and access managers are protected from administrator revocation.",
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
