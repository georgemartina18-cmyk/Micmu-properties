import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { database } from "@/lib/supabase";
import { sameOrigin } from "@/lib/request";
import { searchSchema } from "@/lib/validation";
async function mutate(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Request not allowed." },
      { status: 403 },
    );
  const db = await database();
  if (!db)
    return NextResponse.json(
      { error: "Saved searches require a connected account service." },
      { status: 503 },
    );
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Please sign in to save or remove a search." },
      { status: 401 },
    );
  const raw = await req.text();
  if (raw.length > 5000)
    return NextResponse.json(
      { error: "Search is too large." },
      { status: 413 },
    );
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid search." }, { status: 400 });
  }
  if (req.method === "DELETE") {
    const p = z.object({ id: z.uuid() }).safeParse(body);
    if (!p.success)
      return NextResponse.json({ error: "Invalid search." }, { status: 400 });
    const { error } = await db
      .from("saved_searches")
      .delete()
      .eq("id", p.data.id)
      .eq("user_id", user.id);
    return error
      ? NextResponse.json(
          { error: "The search could not be removed." },
          { status: 400 },
        )
      : NextResponse.json({ message: "Saved search removed." });
  }
  const p = searchSchema.safeParse(body);
  if (!p.success)
    return NextResponse.json(
      { error: "Enter a short name and valid filters." },
      { status: 400 },
    );
  const { error } = await db
    .from("saved_searches")
    .insert({ user_id: user.id, ...p.data });
  return error
    ? NextResponse.json(
        { error: "Search could not be saved." },
        { status: 400 },
      )
    : NextResponse.json(
        {
          message:
            "Search saved. Open Saved searches in your dashboard to run it again. Alerts are not enabled yet.",
        },
        { status: 201 },
      );
}
export const POST = mutate;
export const DELETE = mutate;
