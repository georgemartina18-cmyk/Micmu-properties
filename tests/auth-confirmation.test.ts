import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { readConfirmationLink } from "../lib/auth-confirmation";
const m = vi.hoisted(() => ({
  verify: vi.fn(),
  exchange: vi.fn(),
  reset: vi.fn(),
  configured: true,
}));
vi.mock("../lib/supabase", () => ({
  database: async () =>
    m.configured
      ? {
          auth: {
            verifyOtp: m.verify,
            exchangeCodeForSession: m.exchange,
            resetPasswordForEmail: m.reset,
          },
        }
      : null,
}));
import { POST } from "../app/api/auth/confirm/route";
import { POST as authenticate } from "../app/api/auth/route";
const fake = "synthetic-test-only";
function request(body: unknown, origin = "https://micmuproperties.com.ng") {
  return new NextRequest("https://micmuproperties.com.ng/api/auth/confirm", {
    method: "POST",
    headers: { origin, host: "micmuproperties.com.ng" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  m.configured = true;
  m.verify.mockResolvedValue({
    data: { session: { user: { id: "test" } } },
    error: null,
  });
  m.exchange.mockResolvedValue({
    data: { session: {}, redirectType: null },
    error: null,
  });
  m.reset.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());
it("rejects cross-origin requests before touching credentials", async () => {
  expect(
    (
      await POST(
        request(
          { kind: "otp", token_hash: fake, type: "recovery" },
          "https://evil.example",
        ),
      )
    ).status,
  ).toBe(403);
  expect(m.verify).not.toHaveBeenCalled();
  expect(m.exchange).not.toHaveBeenCalled();
});
it("uses exactly one verification method for recovery and keeps credentials out of responses", async () => {
  const response = await POST(
    request({ kind: "otp", token_hash: fake, type: "recovery" }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ redirect: "/reset-password" });
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(m.verify).toHaveBeenCalledTimes(1);
  expect(m.exchange).not.toHaveBeenCalled();
});
it.each(["signup", "email"])(
  "preserves %s confirmation without a second exchange",
  async (type) => {
    expect(
      await (
        await POST(request({ kind: "otp", token_hash: fake, type }))
      ).json(),
    ).toEqual({ redirect: "/dashboard" });
    expect(m.verify).toHaveBeenCalledTimes(1);
    expect(m.exchange).not.toHaveBeenCalled();
  },
);
it("preserves PKCE recovery context and the SDK flow-specific verifier", async () => {
  const response = await POST(
    request({
      kind: "pkce",
      code: fake,
      flow_id: "synthetic-flow",
      recovery: true,
    }),
  );
  expect(await response.json()).toEqual({ redirect: "/reset-password" });
  expect(m.exchange).toHaveBeenCalledExactlyOnceWith(fake, {
    flowId: "synthetic-flow",
  });
  expect(m.verify).not.toHaveBeenCalled();
});
it("recognizes recovery from the SDK when older callbacks have no explicit type", async () => {
  m.exchange.mockResolvedValue({
    data: { session: {}, redirectType: "recovery" },
  });
  expect(
    await (
      await POST(request({ kind: "pkce", code: fake, recovery: false }))
    ).json(),
  ).toEqual({ redirect: "/reset-password" });
});
it.each([
  { kind: "otp", token_hash: fake, type: "recovery", code: fake },
  { kind: "otp", token_hash: fake, type: "invite" },
  {
    kind: "otp",
    token_hash: fake,
    type: "recovery",
    next: "https://evil.example",
  },
  { kind: "pkce", code: fake, recovery: true, flow_id: "../../unsafe" },
])(
  "rejects ambiguous/unsupported input without verification: %j",
  async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(m.verify).not.toHaveBeenCalled();
    expect(m.exchange).not.toHaveBeenCalled();
  },
);
it("handles expiry/replay without retrying, falling back, logging or echoing provider errors", async () => {
  const log = vi.spyOn(console, "log");
  const errorLog = vi.spyOn(console, "error");
  try {
    m.verify.mockResolvedValue({
      data: { session: null },
      error: { code: "otp_expired", message: fake },
    });
    const response = await POST(
      request({ kind: "otp", token_hash: fake, type: "recovery" }),
    );
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain(fake);
    expect(m.verify).toHaveBeenCalledTimes(1);
    expect(m.exchange).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(errorLog).not.toHaveBeenCalled();
  } finally {
    log.mockRestore();
    errorLog.mockRestore();
  }
});
it("fails safely on missing configuration and thrown SDK errors", async () => {
  m.configured = false;
  expect(
    (await POST(request({ kind: "otp", token_hash: fake, type: "recovery" })))
      .status,
  ).toBe(503);
  m.configured = true;
  m.exchange.mockRejectedValue(new Error(fake));
  const response = await POST(
    request({ kind: "pkce", code: fake, recovery: true }),
  );
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain(fake);
  expect(m.verify).not.toHaveBeenCalled();
});
it("does not announce successful reset requests when Supabase rejects them", async () => {
  m.reset.mockResolvedValue({ error: { message: fake } });
  const response = await authenticate(
    request({ mode: "reset", email: "test@example.test" }),
  );
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain(fake);
});
it("requests exactly one reset email and preserves the recovery destination", async () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://micmuproperties.com.ng/");
  const response = await authenticate(
    request({ mode: "reset", email: "test@example.test" }),
  );
  expect(response.status).toBe(200);
  expect(m.reset).toHaveBeenCalledExactlyOnceWith("test@example.test", {
    redirectTo:
      "https://micmuproperties.com.ng/auth/confirm?next=/reset-password",
  });
  expect(m.verify).not.toHaveBeenCalled();
  expect(m.exchange).not.toHaveBeenCalled();
});
it("parses both fragment and legacy query hash links", () => {
  for (const separator of ["#", "?"])
    expect(
      readConfirmationLink(
        `https://micmuproperties.com.ng/auth/confirm${separator}token_hash=${fake}&type=recovery`,
      ),
    ).toEqual({ input: { kind: "otp", token_hash: fake, type: "recovery" } });
});
it("retains PKCE routing/flow identifiers but never accepts arbitrary destinations", () => {
  expect(
    readConfirmationLink(
      `https://micmuproperties.com.ng/auth/confirm?code=${fake}&sb_flow_id=synthetic-flow&next=/reset-password`,
    ),
  ).toEqual({
    input: {
      kind: "pkce",
      code: fake,
      flow_id: "synthetic-flow",
      recovery: true,
    },
  });
  expect(
    readConfirmationLink(
      `https://micmuproperties.com.ng/auth/confirm?code=${fake}&next=https://evil.example`,
    ),
  ).toEqual({ input: { kind: "pkce", code: fake, recovery: false } });
});
it.each([
  `?code=${fake}&token_hash=${fake}&type=recovery`,
  `?code=${fake}#token_hash=${fake}&type=recovery`,
  `?token_hash=${fake}&token_hash=${fake}&type=recovery`,
  `#access_token=${fake}&refresh_token=${fake}`,
  "",
  `?token_hash=${fake}&type=other`,
])(
  "rejects malformed/ambiguous callbacks without consuming anything: %s",
  (suffix) => {
    expect(
      readConfirmationLink(
        `https://micmuproperties.com.ng/auth/confirm${suffix}`,
      ),
    ).toEqual({ error: "invalid" });
    expect(m.verify).not.toHaveBeenCalled();
    expect(m.exchange).not.toHaveBeenCalled();
  },
);
it("classifies provider error callbacks without reflecting sensitive descriptions", () => {
  expect(
    readConfirmationLink(
      `https://micmuproperties.com.ng/auth/confirm#error=access_denied&error_code=otp_expired&error_description=${fake}`,
    ),
  ).toEqual({ error: "expired" });
});
