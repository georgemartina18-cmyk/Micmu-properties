import { test, expect } from "@playwright/test";

test("staff access never exposes controls or account data without a session", async ({
  page,
  request,
}) => {
  await page.goto("/admin/staff");
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("button", { name: "Grant administrator access" }),
  ).toHaveCount(0);
  const denied = await request.post("/api/staff", {
    headers: { origin: "https://attacker.example" },
    data: { action: "grant", user: "11111111-1111-4111-8111-111111111111" },
  });
  expect(denied.status()).toBe(403);
  const unavailable = await request.post("/api/staff", {
    headers: { origin: "http://127.0.0.1:3000" },
    data: { action: "lookup", email: "private@example.test" },
  });
  expect(unavailable.status()).toBe(503);
  expect(unavailable.headers()["cache-control"]).toContain("no-store");
  expect(await unavailable.json()).not.toHaveProperty("account");
});
