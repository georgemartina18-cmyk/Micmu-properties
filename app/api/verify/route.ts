import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/supabase";
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const reference = req.nextUrl.searchParams.get("reference")?.trim();
  if (
    !["property", "representative"].includes(type || "") ||
    !reference ||
    reference.length > 60
  )
    return NextResponse.json(
      { error: "Enter a valid reference." },
      { status: 400 },
    );
  const db = await database();
  if (!db)
    return NextResponse.json(
      {
        error:
          "Verification is not connected yet. No reference has been verified.",
      },
      { status: 503 },
    );
  const { data, error } = await db
    .from("verification_records")
    .select("public_label,status")
    .eq("kind", type)
    .eq("reference", reference)
    .eq("published", true)
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: "Verification is temporarily unavailable." },
      { status: 503 },
    );
  return NextResponse.json({
    message: data
      ? `${data.public_label} — ${data.status}. ${type === "property" ? "This confirms an internal MICMU record only, not government land-title verification." : "Confirm the scope of authority directly with MICMU before making any payment."}`
      : "No approved public record was found for this reference. Please contact MICMU.",
  });
}
