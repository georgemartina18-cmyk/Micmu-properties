import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn() }));
vi.mock("../lib/supabase", () => ({
  submissionDatabase: async () => ({ rpc: mocks.rpc }),
  database: async () => ({ auth: { getUser: mocks.getUser } }),
}));
import { POST } from "../app/api/enquiries/route";
const payload = {
  kind: "contact",
  name: "Test",
  email: "test@example.test",
  phone: "+2348000000000",
  message: "A test enquiry",
  consent: true,
  turnstile: "test-challenge",
  request_id: "11111111-1111-4111-8111-111111111111",
};
function request(body: unknown = payload, origin = "https://app.example") {
  return new NextRequest("https://app.example/api/enquiries", {
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
  vi.stubEnv("TURNSTILE_SECRET_KEY", "unit-test-placeholder-not-a-real-key");
  mocks.rpc.mockReset();
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "22222222-2222-4222-8222-222222222222" } },
  });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, hostname: "app.example" }),
          { status: 200 },
        ),
      ),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Enquiry route boundary", () => {
  it("rejects cross-origin writes before any persistence", async () => {
    expect(
      (await POST(request(payload, "https://attacker.example"))).status,
    ).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects invalid consent before any persistence", async () => {
    expect((await POST(request({ ...payload, consent: false }))).status).toBe(
      400,
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects failed challenges", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: false })),
    );
    expect((await POST(request())).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects challenges issued for a different hostname", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, hostname: "other.example" }),
      ),
    );
    expect((await POST(request())).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not acknowledge requests on challenge network failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network offline"));
    expect((await POST(request())).status).toBe(503);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not confirm failed database writes", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "database unavailable" },
    });
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("could not be saved");
  });
  it("only acknowledges persistence and derives ownership from the verified server session", async () => {
    mocks.rpc.mockResolvedValue({ data: "saved-test-id", error: null });
    const response = await POST(
      request({ ...payload, user_id: "attacker-supplied-id" }),
    );
    expect(response.status).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith("submit_enquiry", {
      payload: expect.not.objectContaining({ user_id: "attacker-supplied-id" }),
      caller_id: "22222222-2222-4222-8222-222222222222",
    });
    expect((await response.json()).message).toContain("saved-test-id");
  });
  it("returns a rate-limit response without a success message", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "rate limit" },
    });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect((await response.json()).message).toBeUndefined();
  });
});
