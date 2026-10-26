import { sameOrigin } from "@/lib/request";
import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/supabase";
import { z } from "zod";
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Request not allowed." },
      { status: 403 },
    );
  const db = await database();
  if (!db)
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const p = z
    .object({ full_name: z.string().trim().min(1).max(120) })
    .safeParse(await req.json().catch(() => null));
  if (!p.success)
    return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  const { error } = await db
    .from("profiles")
    .upsert({ id: user.id, full_name: p.data.full_name });
  return error
    ? NextResponse.json(
        { error: "Profile could not be saved." },
        { status: 400 },
      )
    : NextResponse.json({ message: "Profile saved." });
}
