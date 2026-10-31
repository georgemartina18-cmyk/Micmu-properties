import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  getUser: vi.fn(),
  aal: vi.fn(),
  configured: true,
}));
vi.mock("../lib/supabase", () => ({
  database: async () =>
    m.configured
      ? {
          auth: { getUser: m.getUser },
          rpc: m.rpc,
        }
      : null,
}));
vi.mock("../lib/assurance", () => ({ hasSecondFactor: m.aal }));
import { POST } from "../app/api/staff/route";
const id = "11111111-1111-4111-8111-111111111111";
function req(body: unknown, origin = "https://app.example") {
  return new NextRequest("https://app.example/api/staff", {
    method: "POST",
    headers: { origin, host: "app.example" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  m.configured = true;
  m.getUser.mockResolvedValue({ data: { user: { id } }, error: null });
  m.aal.mockResolvedValue(true);
  m.rpc.mockResolvedValue({ data: true, error: null });
});
it("rejects cross-origin requests before looking up an account", async () => {
  expect(
    (await POST(req({ action: "grant", user: id }, "https://evil.example")))
      .status,
  ).toBe(403);
  expect(m.getUser).not.toHaveBeenCalled();
  expect(m.rpc).not.toHaveBeenCalled();
});
it("fails closed for missing database, invalid session, and missing MFA", async () => {
  m.configured = false;
  expect((await POST(req({}))).status).toBe(503);
  m.configured = true;
  m.getUser.mockResolvedValue({ data: { user: null } });
  expect((await POST(req({}))).status).toBe(401);
  m.getUser.mockResolvedValue({
    data: { user: { id } },
    error: { message: "invalid" },
  });
  expect((await POST(req({}))).status).toBe(401);
  m.getUser.mockResolvedValue({ data: { user: { id } } });
  m.aal.mockResolvedValue(false);
  expect((await POST(req({}))).status).toBe(403);
  expect(m.rpc).not.toHaveBeenCalled();
});
it.each(["admin", "realtor", "client"])(
  "denies %s without owner designation",
  async () => {
    m.rpc.mockResolvedValue({ data: false, error: null });
    expect((await POST(req({ action: "grant", user: id }))).status).toBe(403);
    expect(m.rpc).toHaveBeenCalledTimes(1);
  },
);
it("fails closed when the owner migration is absent", async () => {
  m.rpc.mockResolvedValue({
    data: null,
    error: { message: "unknown function" },
  });
  expect((await POST(req({ action: "grant", user: id }))).status).toBe(403);
});
it.each([
  { action: "owner", user: id },
  { action: "grant", user: "bad" },
  { action: "grant", user: id, role: "owner" },
  { action: "lookup", email: "bad" },
])("rejects unsupported or forged payloads: %j", async (body) => {
  expect((await POST(req(body))).status).toBe(400);
  expect(m.rpc).toHaveBeenCalledTimes(1);
});
it("handles malformed JSON and oversized requests", async () => {
  const make = (body: string) =>
    new NextRequest("https://app.example/api/staff", {
      method: "POST",
      headers: { origin: "https://app.example", host: "app.example" },
      body,
    });
  expect((await POST(make("{"))).status).toBe(400);
  expect((await POST(make("x".repeat(2001)))).status).toBe(413);
});
it("only returns an exact eligible account lookup and does not cache private data", async () => {
  m.rpc.mockImplementation(async (name: string) => ({
    data: name === "is_company_owner" ? true : [{ user_id: id }],
    error: null,
  }));
  const response = await POST(
    req({ action: "lookup", email: "staff@example.test" }),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(m.rpc).toHaveBeenLastCalledWith("find_staff_account", {
    p_email: "staff@example.test",
  });
});
it("does not return an unconfirmed or nonexistent account", async () => {
  m.rpc.mockImplementation(async (name: string) => ({
    data: name === "is_company_owner" ? true : [],
    error: null,
  }));
  expect(
    (await POST(req({ action: "lookup", email: "missing@example.test" })))
      .status,
  ).toBe(404);
});
it.each(["grant", "revoke"])(
  "uses only the narrow RPC for %s",
  async (action) => {
    expect((await POST(req({ action, user: id }))).status).toBe(200);
    expect(m.rpc).toHaveBeenLastCalledWith("set_staff_administrator", {
      p_user: id,
      p_grant: action === "grant",
    });
  },
);
it("reports database rejection without claiming success", async () => {
  m.rpc.mockImplementation(async (name: string) =>
    name === "is_company_owner"
      ? { data: true }
      : { error: { message: "blocked" } },
  );
  expect((await POST(req({ action: "revoke", user: id }))).status).toBe(400);
});
