import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { passwordUpdateFailure } from "../lib/password-update";
const m = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateUser: vi.fn(),
  aal: vi.fn(),
  configured: true,
}));
vi.mock("../lib/supabase", () => ({
  database: async () =>
    m.configured
      ? { auth: { getUser: m.getUser, updateUser: m.updateUser } }
      : null,
}));
vi.mock("../lib/assurance", () => ({ hasSecondFactor: m.aal }));
import { POST } from "../app/api/auth/route";
const sensitiveMarker = "synthetic-private-marker-never-expose";
function req(
  password = "Synthetic-New-Password-123!",
  origin = "https://micmuproperties.com.ng",
) {
  return new NextRequest("https://micmuproperties.com.ng/api/auth", {
    method: "POST",
    headers: { origin, host: "micmuproperties.com.ng" },
    body: JSON.stringify({ mode: "update", password }),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  m.configured = true;
  m.aal.mockResolvedValue(false);
  m.getUser.mockResolvedValue({
    data: { user: { id: "synthetic" } },
    error: null,
  });
  m.updateUser.mockResolvedValue({ error: null });
});
it.each([
  ["same_password", 400],
  ["weak_password", 400],
  ["insufficient_aal", 403],
  ["reauthentication_needed", 403],
  ["reauth_nonce_missing", 403],
  ["reauthentication_not_valid", 403],
  ["session_not_found", 401],
  ["session_expired", 401],
  ["refresh_token_not_found", 401],
  ["refresh_token_already_used", 401],
  ["bad_jwt", 401],
  ["user_banned", 403],
  ["user_sso_managed", 403],
  ["over_request_rate_limit", 429],
  ["request_timeout", 503],
  ["unexpected_failure", 503],
])("returns a safe actionable response for %s", async (code, status) => {
  m.updateUser.mockResolvedValue({ error: { code, message: sensitiveMarker } });
  const response = await POST(req());
  expect(response.status).toBe(status);
  const body = await response.json();
  expect(body.code).toBe(code);
  expect(body.error).toContain(`Support code: ${code}`);
  expect(JSON.stringify(body)).not.toContain(sensitiveMarker);
  expect(body.action).toBe(
    code === "insufficient_aal" ? "verify_mfa" : undefined,
  );
  expect(m.updateUser).toHaveBeenCalledTimes(1);
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("does not advise replacing a valid recovery session for password-policy errors", async () => {
  for (const code of ["same_password", "weak_password"]) {
    m.updateUser.mockResolvedValue({ error: { code } });
    expect((await (await POST(req())).json()).error).not.toMatch(
      /new recovery|fresh recovery/i,
    );
  }
});
it("fails closed on invalid user/session before attempting a password update", async () => {
  m.getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect((await POST(req())).status).toBe(401);
  m.getUser.mockResolvedValue({
    data: { user: { id: "untrusted" } },
    error: { code: "bad_jwt", message: sensitiveMarker },
  });
  expect((await POST(req())).status).toBe(401);
  expect(m.updateUser).not.toHaveBeenCalled();
});
it("never exposes arbitrary error codes, names, messages or thrown exceptions", async () => {
  const logger = vi.spyOn(console, "error");
  try {
    for (const error of [
      { code: sensitiveMarker, message: sensitiveMarker },
      { code: "__proto__" },
      { name: sensitiveMarker },
      null,
    ]) {
      expect(passwordUpdateFailure(error).code).toBe("password_update_failed");
      expect(JSON.stringify(passwordUpdateFailure(error))).not.toContain(
        sensitiveMarker,
      );
    }
    m.updateUser.mockRejectedValue(new Error(sensitiveMarker));
    const response = await POST(req());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain(sensitiveMarker);
    expect(logger).not.toHaveBeenCalled();
  } finally {
    logger.mockRestore();
  }
});
it("preserves same-origin checks and password minimum length", async () => {
  expect((await POST(req(undefined, "https://attacker.example"))).status).toBe(
    403,
  );
  expect((await POST(req("short"))).status).toBe(400);
  expect(m.updateUser).not.toHaveBeenCalled();
});
it("still saves a valid new password once using the authenticated session", async () => {
  const response = await POST(req());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ redirect: "/dashboard" });
  expect(m.updateUser).toHaveBeenCalledExactlyOnceWith({
    password: "Synthetic-New-Password-123!",
  });
});

it("requires an enrolled authenticator before attempting a password update and accepts AAL2 afterwards", async () => {
  m.getUser.mockResolvedValue({
    data: {
      user: {
        id: "synthetic",
        factors: [{ status: "verified", factor_type: "totp" }],
      },
    },
    error: null,
  });
  const blocked = await POST(req());
  expect(blocked.status).toBe(403);
  expect(await blocked.json()).toMatchObject({
    code: "insufficient_aal",
    action: "verify_mfa",
  });
  expect(m.updateUser).not.toHaveBeenCalled();
  m.aal.mockResolvedValue(true);
  expect((await POST(req())).status).toBe(200);
  expect(m.updateUser).toHaveBeenCalledTimes(1);
});
it("ignores user-editable metadata when determining MFA enrollment", async () => {
  m.getUser.mockResolvedValue({
    data: {
      user: {
        id: "synthetic",
        user_metadata: { factors: [{ status: "verified" }] },
      },
    },
  });
  expect((await POST(req())).status).toBe(200);
  expect(m.aal).not.toHaveBeenCalled();
});
