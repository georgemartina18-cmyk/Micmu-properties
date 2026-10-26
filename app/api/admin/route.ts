import { hasSecondFactor } from "@/lib/assurance";
import { sameOrigin } from "@/lib/request";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { database } from "@/lib/supabase";
import {
  propertySchema,
  contentSchema,
  settingsSchema,
} from "@/lib/validation";
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Request not allowed." },
      { status: 403 },
    );
  const db = await database();
  if (!db)
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { data: role } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role)
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 403 },
    );
  if (!(await hasSecondFactor(db)))
    return NextResponse.json(
      {
        error:
          "Verify your authenticator in Account security before using administration.",
      },
      { status: 403 },
    );
  const raw = await req.text();
  if (raw.length > 40000)
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const id = body.id;
  if (id && !z.uuid().safeParse(id).success)
    return NextResponse.json({ error: "Invalid record." }, { status: 400 });
  let error;
  if (body.action === "property" || body.action === "content") {
    const parsed = (
      body.action === "property" ? propertySchema : contentSchema
    ).safeParse(body.data);
    if (!parsed.success)
      return NextResponse.json(
        {
          error: parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
        { status: 400 },
      );
    if (body.action === "property" && "gallery_urls" in parsed.data) {
      const ids = [
        ...new Set(
          [parsed.data.image_url, ...parsed.data.gallery_urls]
            .filter(Boolean)
            .map((url) => url!.split("/").pop()!),
        ),
      ];
      if (ids.length) {
        const { data: assets, error: mediaError } = await db
          .from("media_assets")
          .select("id")
          .in("id", ids)
          .eq("approved", true);
        if (mediaError || assets?.length !== ids.length)
          return NextResponse.json(
            { error: "Every image must come from the approved Media Library." },
            { status: 400 },
          );
      }
    }
    const table = body.action === "property" ? "properties" : "content";
    ({ error } = id
      ? await db.from(table).update(parsed.data).eq("id", id)
      : await db.from(table).insert([parsed.data]));
  } else if (body.action === "archive-property" && id) {
    ({ error } = await db
      .from("properties")
      .update({ published: false, archived_at: new Date().toISOString() })
      .eq("id", id));
  } else if (body.action === "restore-property" && id) {
    ({ error } = await db
      .from("properties")
      .update({ published: false, archived_at: null })
      .eq("id", id));
  } else if (body.action === "settings") {
    const parsed = settingsSchema.safeParse(body.data);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Check the email, phone, WhatsApp and Facebook formats." },
        { status: 400 },
      );
    ({ error } = await db
      .from("site_settings")
      .upsert({ id: "public", value: parsed.data }));
  } else if (body.action === "enquiry" && id) {
    const parsed = z
      .enum([
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "approved",
        "rejected",
      ])
      .safeParse(body.data?.status);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    ({ error } = await db
      .from("enquiries")
      .update({ status: parsed.data })
      .eq("id", id));
  } else if (body.action === "approve-realtor" && id) {
    ({ error } = await db.rpc("approve_realtor", { application_id: id }));
  } else
    return NextResponse.json(
      { error: "Unsupported operation." },
      { status: 400 },
    );
  return error
    ? NextResponse.json(
        {
          error:
            body.action === "approve-realtor"
              ? "Approval failed. The applicant needs a confirmed account using the application email."
              : "The change could not be saved. Check for duplicate references or invalid fields.",
        },
        { status: 400 },
      )
    : NextResponse.json({ message: "Saved." });
}
