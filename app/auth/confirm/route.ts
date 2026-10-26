import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { database } from "@/lib/supabase";
export async function GET(req: NextRequest) {
  const db = await database();
  const hash = req.nextUrl.searchParams.get("token_hash");
  const type = req.nextUrl.searchParams.get("type");
  const code = req.nextUrl.searchParams.get("code");
  let ok = false;
  if (db && hash && ["signup", "recovery", "email"].includes(type || "")) {
    const { error } = await db.auth.verifyOtp({
      token_hash: hash,
      type: type as EmailOtpType,
    });
    ok = !error;
  } else if (db && code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    ok = !error;
  }
  return NextResponse.redirect(
    new URL(
      ok
        ? type === "recovery"
          ? "/reset-password"
          : "/dashboard"
        : "/login?notice=invalid-link",
      req.url,
    ),
  );
}
