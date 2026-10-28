import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { database } from "@/lib/supabase";
import { hasSecondFactor } from "@/lib/assurance";
import { sameOrigin } from "@/lib/request";
const uuid = z.uuid();
const amount = z
  .number()
  .positive()
  .max(1e12)
  .refine(
    (v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.001,
    "Use at most two decimal places",
  );
const date = z.iso.date();
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel-sale"), sale: uuid }),
  z.object({ action: z.literal("due-date"), id: uuid, date }),
  z.object({
    action: z.literal("apply"),
    name: z.string().trim().min(2).max(180),
    phone: z.string().trim().min(7).max(24),
    years: z.number().min(0).max(80),
    sales: z.int().min(0).max(1000000),
    code: z.string().trim().max(64).default(""),
  }),
  z.object({
    action: z.literal("review"),
    user: uuid,
    status: z.enum(["approved", "rejected", "suspended"]),
  }),
  z.object({
    action: z.literal("sale"),
    reference: z.string().trim().min(2).max(80),
    property: uuid,
    seller: uuid,
    base: amount,
    plan: z.union([z.literal(0), z.literal(3), z.literal(6), z.literal(12)]),
    discounted: z.boolean(),
    full: amount,
    agreement: z.string().max(3000),
    start: date,
  }),
  z.object({
    action: z.literal("confirm"),
    sale: uuid,
    rates: z
      .array(z.number().min(0).max(100))
      .length(3)
      .refine((v) => v.reduce((a, b) => a + b, 0) <= 100),
  }),
  z.object({
    action: z.literal("receipt"),
    sale: uuid,
    reference: z.string().trim().min(2).max(100),
    amount,
    date,
  }),
  z.object({
    action: z.literal("commission"),
    sale: uuid,
    generation: z.int().min(0).max(2),
    status: z.enum(["approved", "paid", "cancelled"]),
  }),
]);
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Request not allowed." },
      { status: 403 },
    );
  const raw = await req.text();
  if (raw.length > 10000)
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    return NextResponse.json(
      {
        error: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  const db = await database();
  if (!db)
    return NextResponse.json(
      { error: "Database unavailable." },
      { status: 503 },
    );
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = parsed.data;
  if (b.action !== "apply") {
    const { data: role } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role || !(await hasSecondFactor(db)))
      return NextResponse.json(
        { error: "Verified administrator required." },
        { status: 403 },
      );
  }
  let result;
  switch (b.action) {
    case "cancel-sale":
      result = await db.rpc("cancel_realtor_sale", { p_sale: b.sale });
      break;
    case "due-date":
      result = await db.rpc("set_instalment_date", {
        p_id: b.id,
        p_date: b.date,
      });
      break;
    case "apply":
      result = await db.rpc("apply_realtor", {
        p_name: b.name,
        p_phone: b.phone,
        p_years: b.years,
        p_sales: b.sales,
        p_code: b.code,
      });
      break;
    case "review":
      result = await db.rpc("review_realtor", {
        p_user: b.user,
        p_status: b.status,
      });
      break;
    case "sale":
      result = await db.rpc("create_realtor_sale", {
        p_reference: b.reference,
        p_property: b.property,
        p_seller: b.seller,
        p_base: b.base,
        p_plan: b.plan,
        p_discounted: b.discounted,
        p_full: b.full,
        p_agreement: b.agreement,
        p_start: b.start,
      });
      break;
    case "confirm":
      result = await db.rpc("confirm_realtor_sale", {
        p_sale: b.sale,
        p_custom: b.rates,
      });
      break;
    case "receipt":
      result = await db.rpc("record_sale_receipt", {
        p_sale: b.sale,
        p_reference: b.reference,
        p_amount: b.amount,
        p_date: b.date,
      });
      break;
    case "commission":
      result = await db.rpc("set_sale_commission_status", {
        p_sale: b.sale,
        p_generation: b.generation,
        p_status: b.status,
      });
      break;
  }
  if (result.error)
    return NextResponse.json(
      {
        error:
          "Could not save. Check the storage setup, account approval, references and transaction rules. No successful change has been confirmed.",
      },
      { status: 400 },
    );
  return NextResponse.json({
    message:
      b.action === "apply"
        ? "Application received. Registration is free. MICMU will review your application."
        : "Saved. Refresh to see updated records.",
  });
}
