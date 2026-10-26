import { sameOrigin } from "@/lib/request";
import { NextRequest, NextResponse } from "next/server";
import { database, submissionDatabase } from "@/lib/supabase";
import { submissionSchema } from "@/lib/validation";
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 },
    );
  const db = await submissionDatabase();
  if (!db || !process.env.TURNSTILE_SECRET_KEY)
    return NextResponse.json(
      {
        error:
          "Online requests are not configured. Your request has not been saved.",
      },
      { status: 503 },
    );
  const raw = await req.text();
  if (raw.length > 16000)
    return NextResponse.json(
      { error: "Request is too large." },
      { status: 413 },
    );
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  const { turnstile, ...data } = parsed.data;
  if (data.property_id) {
    const { data: property, error: propertyError } = await db
      .from("properties")
      .select("id")
      .eq("id", data.property_id)
      .eq("published", true)
      .eq("review_status", "Approved")
      .is("archived_at", null)
      .maybeSingle();
    if (propertyError || !property)
      return NextResponse.json(
        {
          error:
            "This property is not currently published. Please choose a current listing or make a general enquiry.",
        },
        { status: 400 },
      );
  }

  let challenge: { success?: boolean; hostname?: string };
  try {
    const result = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: turnstile,
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!result.ok) throw new Error();
    challenge = await result.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "Security verification is temporarily unavailable. Please retry.",
      },
      { status: 503 },
    );
  }
  if (!challenge.success || challenge.hostname !== req.nextUrl.hostname)
    return NextResponse.json(
      { error: "Security check failed or expired. Please try again." },
      { status: 400 },
    );
  const session = await database();
  const user = session ? (await session.auth.getUser()).data.user : null;
  const { data: record, error } = await db.rpc("submit_enquiry", {
    payload: data,
    caller_id: user?.id ?? null,
  });
  if (error)
    return NextResponse.json(
      {
        error: error.message.includes("rate limit")
          ? "Too many requests. Please wait before trying again."
          : "The request could not be saved. Check property availability and try again.",
      },
      { status: error.message.includes("rate limit") ? 429 : 400 },
    );
  return NextResponse.json(
    {
      message:
        data.kind === "inspection"
          ? `Request saved (${record}). Your inspection is pending MICMU confirmation.`
          : `Your request has been saved (${record}).`,
      id: record,
    },
    { status: 201 },
  );
}
