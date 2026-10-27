import { hasSecondFactor } from "@/lib/assurance";
import { sameOrigin } from "@/lib/request";
import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/supabase";

import { imageType } from "@/lib/media";
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Request not allowed." },
      { status: 403 },
    );
  const db = await database();
  if (!db)
    return NextResponse.json(
      { error: "Media storage is not configured." },
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
      { error: "Administrator access required." },
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
  if (Number(req.headers.get("content-length")) > 5500000)
    return NextResponse.json(
      { error: "Maximum image size is 5 MB." },
      { status: 413 },
    );
  let form;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  const file = form.get("file");
  const source = String(form.get("source") || "").trim();
  const category = String(form.get("category") || "").trim();
  if (
    !(file instanceof File) ||
    !file.size ||
    file.size > 5242880 ||
    !source ||
    source.length > 500 ||
    form.get("approved") !== "on" ||
    category.length > 100
  )
    return NextResponse.json(
      {
        error:
          "Provide a permitted image, ownership source and publication approval.",
      },
      { status: 400 },
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = imageType(bytes);
  if (!type || type !== file.type)
    return NextResponse.json(
      {
        error:
          "Only valid JPEG, PNG and WebP images are accepted. SVG and executable files are not allowed.",
      },
      { status: 400 },
    );
  const id = crypto.randomUUID();
  const key = `supabase/approved/${id}`;
  const bucket = db.storage.from("micmu-images");
  try {
    const { error: uploadError } = await bucket.upload(key, bytes, {
      contentType: type,
      upsert: false,
    });
    if (uploadError)
      return NextResponse.json(
        {
          error:
            "Image upload failed. Check that the MICMU image storage setup has been run in Supabase, and that storage space is available.",
        },
        { status: 503 },
      );
    const { error } = await db.from("media_assets").insert({
      id,
      filename: file.name.slice(0, 180),
      object_key: key,
      content_type: type,
      source,
      category,
      property_reference: String(form.get("property_reference") || "").slice(
        0,
        60,
      ),
      approved: true,
      uploaded_by: user.id,
    });
    if (error) {
      await bucket.remove([key]);
      throw new Error();
    }
  } catch {
    return NextResponse.json(
      { error: "Upload failed. Please retry." },
      { status: 503 },
    );
  }
  return NextResponse.json({ url: `/api/media/${id}` }, { status: 201 });
}
