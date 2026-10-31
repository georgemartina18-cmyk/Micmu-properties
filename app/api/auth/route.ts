import { sameOrigin } from "@/lib/request";
import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/supabase";
import { z } from "zod";
const schema = z.object({
  mode: z.enum(["login", "signup", "reset", "update", "logout"]),
  email: z.email().max(254).optional(),
  password: z.string().min(12).max(128).optional(),
});
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
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error: "Enter a valid email and a password of at least 12 characters.",
      },
      { status: 400 },
    );
  const { mode, email, password } = parsed.data;
  const site = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  if (mode === "logout") {
    const { error } = await db.auth.signOut();
    return error
      ? NextResponse.json(
          { error: "Could not sign out. Please retry." },
          { status: 503 },
        )
      : NextResponse.json({ redirect: "/login" });
  }
  if (mode === "reset") {
    if (!email)
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    let resetError;
    try {
      ({ error: resetError } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: `${site.replace(/\/$/, "")}/auth/confirm?next=/reset-password`,
      }));
    } catch {
      resetError = true;
    }
    if (resetError)
      return NextResponse.json(
        {
          error:
            "Reset email could not be requested. Please wait a moment and try again.",
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    return NextResponse.json({
      message:
        "If an account exists, reset instructions will be sent to that address. Check your email.",
    });
  }
  if (mode === "update") {
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user || !password)
      return NextResponse.json(
        { error: "Use a valid recovery link and enter a new password." },
        { status: 401 },
      );
    const { error } = await db.auth.updateUser({ password });
    return error
      ? NextResponse.json(
          { error: "Password update failed. Request a new recovery link." },
          { status: 400 },
        )
      : NextResponse.json({ redirect: "/dashboard" });
  }
  if (!email || !password)
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  if (mode === "signup") {
    const { error } = await db.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${site}/auth/confirm` },
    });
    return error
      ? NextResponse.json(
          {
            error:
              "Account creation could not be completed. Please retry later.",
          },
          { status: 400 },
        )
      : NextResponse.json({
          message:
            "Check your email to confirm your account. Existing accounts can use sign in or password reset.",
        });
  }
  const { error } = await db.auth.signInWithPassword({ email, password });
  return error
    ? NextResponse.json(
        { error: "Sign in failed. Check your details and email confirmation." },
        { status: 401 },
      )
    : NextResponse.json({ redirect: "/dashboard" });
}
