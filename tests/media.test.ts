import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  insert: vi.fn(),
  download: vi.fn(),
  rpc: vi.fn(),
  aal: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({
  database: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "admin" } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { role: "admin" } }),
          }),
        }),
      }),
      insert: m.insert,
    }),
    storage: { from: () => ({ upload: m.upload, remove: m.remove }) },
  }),
  publicDatabase: async () => ({
    rpc: m.rpc,
    storage: { from: () => ({ download: m.download }) },
  }),
}));
vi.mock("../lib/assurance", () => ({ hasSecondFactor: m.aal }));
vi.mock("../lib/r2", () => ({
  mediaBucket: async () => {
    throw new Error("R2 must not be used for Supabase assets");
  },
}));
import { POST } from "../app/api/media/route";
import { GET } from "../app/api/media/[id]/route";
function uploadRequest() {
  const body = new FormData();
  body.set(
    "file",
    new File(
      [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])],
      "test.png",
      { type: "image/png" },
    ),
  );
  body.set("source", "Owner-supplied test image");
  body.set("approved", "on");
  body.set("category", "test");
  return new NextRequest("https://app.example/api/media", {
    method: "POST",
    headers: { origin: "https://app.example", host: "app.example" },
    body,
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  m.aal.mockResolvedValue(true);
  m.upload.mockResolvedValue({ error: null });
  m.remove.mockResolvedValue({ error: null });
  m.insert.mockResolvedValue({ error: null });
});
it("requires MFA before uploading", async () => {
  m.aal.mockResolvedValue(false);
  expect((await POST(uploadRequest())).status).toBe(403);
  expect(m.upload).not.toHaveBeenCalled();
});
it("does not save metadata or report success when storage fails", async () => {
  m.upload.mockResolvedValue({ error: { message: "Bucket not found" } });
  expect((await POST(uploadRequest())).status).toBe(503);
  expect(m.insert).not.toHaveBeenCalled();
});
it("removes the uploaded object when metadata persistence fails", async () => {
  m.insert.mockResolvedValue({ error: { message: "Database failed" } });
  expect((await POST(uploadRequest())).status).toBe(503);
  expect(m.remove).toHaveBeenCalledWith([m.upload.mock.calls[0][0]]);
});
it("returns an existing-style media URL after both writes succeed", async () => {
  const result = await POST(uploadRequest());
  expect(result.status).toBe(201);
  expect((await result.json()).url).toMatch(/^\/api\/media\/[a-f0-9-]+$/);
  expect(m.upload.mock.calls[0][0]).toMatch(/^supabase\/approved\//);
});
const context = {
  params: Promise.resolve({ id: "44444444-4444-4444-8444-444444444444" }),
};
it("does not retrieve objects without approved metadata", async () => {
  m.rpc.mockResolvedValue({ data: [], error: null });
  expect((await GET(new Request("https://app.example"), context)).status).toBe(
    404,
  );
  expect(m.download).not.toHaveBeenCalled();
});
it("serves an approved Supabase image without R2", async () => {
  m.rpc.mockResolvedValue({
    data: [{ object_key: "supabase/approved/test", content_type: "image/png" }],
    error: null,
  });
  m.download.mockResolvedValue({
    data: new Blob(["image bytes"]),
    error: null,
  });
  const result = await GET(new Request("https://app.example"), context);
  expect(result.status).toBe(200);
  expect(result.headers.get("content-type")).toBe("image/png");
  expect(await result.text()).toBe("image bytes");
});
