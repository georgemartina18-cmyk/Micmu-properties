import { sameOrigin } from "@/lib/request";
import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/supabase";
import { z } from "zod";
async function mutate(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Request not allowed." },
      { status: 403 },
    );
  const db = await database();
  if (!db)
    return NextResponse.json(
      { error: "Accounts are not configured yet." },
      { status: 503 },
    );
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Please sign in to save a property." },
      { status: 401 },
    );
  const parsed = z
    .object({ property_id: z.uuid() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid property." }, { status: 400 });
  const { error } =
    req.method === "DELETE"
      ? await db
          .from("saved_properties")
          .delete()
          .eq("user_id", user.id)
          .eq("property_id", parsed.data.property_id)
      : await db
          .from("saved_properties")
          .upsert(
            { user_id: user.id, property_id: parsed.data.property_id },
            { onConflict: "user_id,property_id" },
          );
  return error
    ? NextResponse.json(
        { error: "This property could not be saved." },
        { status: 400 },
      )
    : NextResponse.json({
        message:
          req.method === "DELETE"
            ? "Removed from your shortlist."
            : "Saved to your shortlist. View it in your dashboard.",
      });
}

export const POST = mutate;
export const DELETE = mutate;
