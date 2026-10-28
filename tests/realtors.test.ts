import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  getUser: vi.fn(),
  role: vi.fn(),
  aal: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({
  database: async () => ({
    auth: { getUser: m.getUser },
    rpc: m.rpc,
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: m.role }) }) }),
    }),
  }),
}));
vi.mock("../lib/assurance", () => ({ hasSecondFactor: m.aal }));
import { POST } from "../app/api/realtors/route";
const application = {
  action: "apply",
  name: "Test realtor",
  phone: "07012345678",
  years: 3,
  sales: 5,
  code: "",
};
function req(body: unknown, origin = "https://app.example") {
  return new NextRequest("https://app.example/api/realtors", {
    method: "POST",
    headers: {
      origin,
      host: "app.example",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  m.getUser.mockResolvedValue({ data: { user: { id: "u" } } });
  m.role.mockResolvedValue({ data: { role: "admin" } });
  m.aal.mockResolvedValue(true);
  m.rpc.mockResolvedValue({ error: null });
});
it("permits account holders to submit free applications without admin status", async () => {
  m.role.mockResolvedValue({ data: null });
  expect((await POST(req(application))).status).toBe(200);
  expect(m.rpc).toHaveBeenCalledWith(
    "apply_realtor",
    expect.objectContaining({ p_years: 3, p_sales: 5 }),
  );
});
it("rejects cross-origin writes and malformed application numbers", async () => {
  expect(
    (await POST(req(application, "https://elsewhere.example"))).status,
  ).toBe(403);
  expect((await POST(req({ ...application, sales: -1 }))).status).toBe(400);
  expect(m.rpc).not.toHaveBeenCalled();
});
it("requires MFA-verified admin for approval and financial operations", async () => {
  m.aal.mockResolvedValue(false);
  expect(
    (
      await POST(
        req({
          action: "review",
          user: "11111111-1111-4111-8111-111111111111",
          status: "approved",
        }),
      )
    ).status,
  ).toBe(403);
  expect(m.rpc).not.toHaveBeenCalled();
});
it("never reports successful registration on database failure", async () => {
  m.rpc.mockResolvedValue({ error: { message: "failure" } });
  expect((await POST(req(application))).status).toBe(400);
});
