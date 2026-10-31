import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
// Exercise the real installed Supabase SSR client, including cookie persistence.
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => Array.from(jar, ([name, value]) => ({ name, value })),
    set: (name: string, value: string) => {
      if (value) jar.set(name, value);
      else jar.delete(name);
    },
  }),
}));
import { POST as confirm } from "../app/api/auth/confirm/route";
import { POST as authenticate } from "../app/api/auth/route";
import { POST as mfa } from "../app/api/mfa/route";
const origin = "https://micmuproperties.com.ng";
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  aud: "authenticated",
  role: "authenticated",
  email: "synthetic@example.test",
};
const exp = () => Math.floor(Date.now() / 1000) + 3600;
const session = (aal = "aal1") => ({
  access_token: `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: user.id, exp: exp(), aud: "authenticated", role: "authenticated", aal }))}.synthetic-not-a-real-signature`,
  refresh_token: "synthetic-not-a-real-refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: exp(),
  user,
});
const req = (body: unknown) =>
  new NextRequest(`${origin}/api/auth`, {
    method: "POST",
    headers: { origin, host: "micmuproperties.com.ng" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  jar.clear();
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    "https://synthetic-project.supabase.co",
  );
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "synthetic-publishable-key",
  );
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("persists the verified recovery session and updates the password without reverifying the OTP", async () => {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init: RequestInit) => {
      const url = new URL(String(input));
      calls.push(`${init?.method || "GET"} ${url.pathname}`);
      if (url.pathname === "/auth/v1/verify") return Response.json(session());
      if (url.pathname === "/auth/v1/user") return Response.json(user);
      throw new Error("Unexpected synthetic provider request");
    }),
  );
  const verified = await confirm(
    req({ kind: "otp", token_hash: "synthetic-only", type: "recovery" }),
  );
  expect(verified.status).toBe(200);
  expect(await verified.json()).toEqual({ redirect: "/reset-password" });
  expect(
    Array.from(jar.keys()).some((name) => name.includes("auth-token")),
  ).toBe(true);
  const updated = await authenticate(
    req({ mode: "update", password: "Synthetic-Password-Only-123" }),
  );
  expect(updated.status).toBe(200);
  expect(calls.filter((s) => s.includes("/verify"))).toHaveLength(1);
  expect(calls).toContain("PUT /auth/v1/user");
});
it("uses the real PKCE verifier cookie and flow ID across reset and confirmation requests", async () => {
  let callback: URL | undefined;
  let exchanges = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === "/auth/v1/recover") {
        callback = new URL(url.searchParams.get("redirect_to")!);
        return Response.json({});
      }
      if (url.pathname === "/auth/v1/token") {
        exchanges++;
        const body = JSON.parse(String(init.body));
        expect(body.code_verifier.length).toBeGreaterThan(0);
        return Response.json(session());
      }
      throw new Error("Unexpected synthetic provider request");
    }),
  );
  expect(
    (await authenticate(req({ mode: "reset", email: user.email }))).status,
  ).toBe(200);
  expect(callback?.searchParams.get("next")).toBe("/reset-password");
  const flow_id = callback?.searchParams.get("sb_flow_id") || undefined;
  const result = await confirm(
    req({ kind: "pkce", code: "synthetic-only", flow_id, recovery: true }),
  );
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ redirect: "/reset-password" });
  expect(exchanges).toBe(1);
  expect(
    Array.from(jar.keys()).some(
      (name) => name.includes("auth-token") && !name.includes("verifier"),
    ),
  ).toBe(true);
});

it("surfaces actual SDK MFA and policy rejections safely without repeating recovery verification", async () => {
  let reason = "insufficient_aal";
  let verificationCount = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init: RequestInit) => {
      const path = new URL(String(input)).pathname;
      if (path === "/auth/v1/verify") {
        verificationCount++;
        return Response.json(session());
      }
      if (path === "/auth/v1/user" && init?.method === "PUT")
        return Response.json(
          { code: reason, message: "synthetic-private-provider-details" },
          {
            status: reason === "insufficient_aal" ? 403 : 422,
            headers: { "X-Supabase-Api-Version": "2024-01-01" },
          },
        );
      if (path === "/auth/v1/user") return Response.json(user);
      throw new Error("Unexpected synthetic provider request");
    }),
  );
  expect(
    (
      await confirm(
        req({ kind: "otp", token_hash: "synthetic-only", type: "recovery" }),
      )
    ).status,
  ).toBe(200);
  const mfa = await authenticate(
    req({ mode: "update", password: "Synthetic-New-Password-123!" }),
  );
  expect(mfa.status).toBe(403);
  expect(await mfa.json()).toMatchObject({
    code: "insufficient_aal",
    action: "verify_mfa",
  });
  reason = "weak_password";
  const policy = await authenticate(
    req({ mode: "update", password: "Synthetic-New-Password-123!" }),
  );
  expect(policy.status).toBe(400);
  expect(await policy.text()).not.toContain(
    "synthetic-private-provider-details",
  );
  expect(verificationCount).toBe(1);
});

it("retains the recovery session through an MFA challenge and saves with the upgraded cookie", async () => {
  const factorId = "22222222-2222-4222-8222-222222222222";
  const challengeId = "33333333-3333-4333-8333-333333333333";
  let steppedUp = false;
  let verifications = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init: RequestInit) => {
      const path = new URL(String(input)).pathname;
      if (path === "/auth/v1/verify") {
        verifications++;
        return Response.json(session());
      }
      if (path.endsWith(`/factors/${factorId}/challenge`))
        return Response.json({ id: challengeId, expires_at: exp() });
      if (path.endsWith(`/factors/${factorId}/verify`)) {
        steppedUp = true;
        return Response.json(session("aal2"));
      }
      if (path === "/auth/v1/user" && init?.method === "PUT") {
        const headers = new Headers(init.headers);
        const token = headers.get("Authorization")!.replace(/^Bearer /, "");
        const claims = JSON.parse(atob(token.split(".")[1]));
        if (!steppedUp)
          return Response.json(
            { code: "insufficient_aal", message: "Synthetic MFA required" },
            {
              status: 403,
              headers: { "X-Supabase-Api-Version": "2024-01-01" },
            },
          );
        expect(claims.aal).toBe("aal2");
        return Response.json(user);
      }
      if (path === "/auth/v1/user") return Response.json(user);
      throw new Error("Unexpected synthetic provider request");
    }),
  );
  expect(
    (
      await confirm(
        req({ kind: "otp", token_hash: "synthetic-only", type: "recovery" }),
      )
    ).status,
  ).toBe(200);
  const blocked = await authenticate(
    req({ mode: "update", password: "Synthetic-New-Password-123!" }),
  );
  expect(blocked.status).toBe(403);
  expect(await blocked.json()).toMatchObject({ action: "verify_mfa" });
  expect(
    (await mfa(req({ mode: "verify", factor_id: factorId, code: "123456" })))
      .status,
  ).toBe(200);
  expect(
    (
      await authenticate(
        req({ mode: "update", password: "Synthetic-New-Password-123!" }),
      )
    ).status,
  ).toBe(200);
  expect(verifications).toBe(1);
});
