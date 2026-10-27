import { NextResponse } from "next/server";
import { publicDatabase } from "@/lib/supabase";
import { mediaBucket } from "@/lib/r2";
import { z } from "zod";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return new NextResponse(null, { status: 404 });
  const db = await publicDatabase();
  if (!db) return new NextResponse(null, { status: 503 });
  const { data, error } = await db.rpc("public_media", { asset_id: id });
  if (error || !data?.[0]) return new NextResponse(null, { status: 404 });
  if (data[0].object_key.startsWith("supabase/")) {
    const { data: image, error: downloadError } = await db.storage
      .from("micmu-images")
      .download(data[0].object_key);
    if (downloadError || !image) return new NextResponse(null, { status: 404 });
    return new Response(image, {
      headers: {
        "Content-Type": data[0].content_type,
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  // Existing R2 assets retain their original URLs during migration.
  const bucket = await mediaBucket();
  if (!bucket) return new NextResponse(null, { status: 503 });
  const file = await bucket.get(data[0].object_key);
  if (!file) return new NextResponse(null, { status: 404 });
  return new Response(file.body as unknown as ReadableStream, {
    headers: {
      "Content-Type": data[0].content_type,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      ETag: file.httpEtag,
    },
  });
}
