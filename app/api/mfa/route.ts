import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { database } from "@/lib/supabase";
import { sameOrigin } from "@/lib/request";
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Request not allowed." },
      { status: 403 },
    );
  const db = await database();
  if (!db)
    return NextResponse.json(
      { error: "Accounts are not configured." },
      { status: 503 },
    );
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const raw = await req.json().catch(() => null);
  if (raw?.mode === "enroll") {
    const { data: factors } = await db.auth.mfa.listFactors();
    if (factors?.totp?.some((f) => f.status === "verified"))
      return NextResponse.json(
        { error: "An authenticator is already enrolled. Use its code below." },
        { status: 400 },
      );
    for (const factor of factors?.all || [])
      if (factor.factor_type === "totp" && factor.status === "unverified")
        await db.auth.mfa.unenroll({ factorId: factor.id });
    const { data, error } = await db.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "MICMU authenticator",
    });
    return error
      ? NextResponse.json(
          { error: "Authenticator setup could not start." },
          { status: 400 },
        )
      : NextResponse.json({ id: data.id, qr: data.totp.qr_code });
  }
  const parsed = z
    .object({
      mode: z.literal("verify"),
      factor_id: z.uuid(),
      code: z.string().regex(/^\d{6}$/),
    })
    .safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Enter the six-digit code from your authenticator." },
      { status: 400 },
    );
  const { data, error } = await db.auth.mfa.challenge({
    factorId: parsed.data.factor_id,
  });
  if (error)
    return NextResponse.json(
      { error: "Could not start verification. Please retry." },
      { status: 400 },
    );
  const verified = await db.auth.mfa.verify({
    factorId: parsed.data.factor_id,
    challengeId: data.id,
    code: parsed.data.code,
  });
  return verified.error
    ? NextResponse.json(
        { error: "Code invalid or expired. Try the current code." },
        { status: 400 },
      )
    : NextResponse.json({
        message:
          "Authenticator verified. This session can access authorised administration.",
      });
}
