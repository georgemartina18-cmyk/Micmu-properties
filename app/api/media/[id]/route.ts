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
  const bucket = await mediaBucket();
  if (!db || !bucket) return new NextResponse(null, { status: 503 });
  const { data, error } = await db.rpc("public_media", { asset_id: id });
  if (error || !data?.[0]) return new NextResponse(null, { status: 404 });
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
