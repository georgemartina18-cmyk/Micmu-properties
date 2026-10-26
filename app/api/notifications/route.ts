import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/request";
import { database } from "@/lib/supabase";
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
  const p = z
    .object({ id: z.uuid() })
    .safeParse(await req.json().catch(() => null));
  if (!p.success)
    return NextResponse.json(
      { error: "Invalid notification." },
      { status: 400 },
    );
  const { error } = await db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", p.data.id)
    .eq("user_id", user.id);
  return error
    ? NextResponse.json({ error: "Could not mark as read." }, { status: 400 })
    : NextResponse.json({ message: "Marked as read." });
}
