import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/supabase";
import { sameOrigin } from "@/lib/request";
import { confirmationSchema } from "@/lib/auth-confirmation";
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });

// GET/HEAD never verify credentials. Only an explicit same-origin POST can do so.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "Request not allowed." }, 403);
  const raw = await req.text();
  if (raw.length > 4096)
    return json({ error: "Invalid confirmation request." }, 400);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid confirmation request." }, 400);
  }
  const parsed = confirmationSchema.safeParse(value);
  if (!parsed.success)
    return json({ error: "Invalid confirmation request." }, 400);
  const db = await database();
  if (!db)
    return json(
      {
        error:
          "Account recovery is temporarily unavailable. Please request a new link later.",
      },
      503,
    );
  const b = parsed.data;
  try {
    if (b.kind === "otp") {
      const { data, error } = await db.auth.verifyOtp({
        token_hash: b.token_hash,
        type: b.type,
      });
      if (error || !data.session)
        return json(
          {
            error:
              "This link is invalid, expired or already used. Request a new email and use only its latest link.",
          },
          400,
        );
      return json({
        redirect: b.type === "recovery" ? "/reset-password" : "/dashboard",
      });
    }
    const { data, error } = await db.auth.exchangeCodeForSession(
      b.code,
      b.flow_id ? { flowId: b.flow_id } : undefined,
    );
    if (error || !data.session)
      return json(
        {
          error:
            "This link could not be confirmed. Open the latest email in the same browser used to request it, or request a new link.",
        },
        400,
      );
    return json({
      redirect:
        ("redirectType" in data && data.redirectType === "recovery") ||
        b.recovery
          ? "/reset-password"
          : "/dashboard",
    });
  } catch {
    // Do not log SDK errors: upstream messages may include sensitive URLs.
    // No fallback verifier or automatic retry of a one-time credential.
    return json(
      {
        error:
          "Confirmation could not be completed. Please request a new link.",
      },
      503,
    );
  }
}
