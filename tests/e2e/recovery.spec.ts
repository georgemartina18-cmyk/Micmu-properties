import { test, expect } from "@playwright/test";
// Synthetic credentials only. Never use actual email links in traces or tests.
const fake = "synthetic-browser-test-only";

test("GET, HEAD, reload and prefetch do not verify a recovery link", async ({
  page,
  request,
}) => {
  let calls = 0;
  await page.route("**/api/auth/confirm", async (route) => {
    calls++;
    await route.fulfill({
      status: 503,
      json: { error: "Synthetic unavailable response" },
    });
  });
  const response = await request.head("/auth/confirm");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  await page.goto(`/auth/confirm#token_hash=${fake}&type=recovery`);
  await expect(
    page.getByRole("button", { name: "Continue securely", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/confirm$/);
  await page.reload();
  expect(calls).toBe(0);
  const prefetch = await request.get("/auth/confirm", {
    headers: { purpose: "prefetch", "next-router-prefetch": "1" },
  });
  expect(prefetch.status()).toBe(200);
  expect(calls).toBe(0);
});

test("explicit confirmation submits once, scrubs credentials and preserves password-reset routing", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/auth/confirm", async (route) => {
    calls++;
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({
      kind: "otp",
      token_hash: fake,
      type: "recovery",
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    await route.fulfill({ status: 200, json: { redirect: "/reset-password" } });
  });
  await page.route("**/reset-password", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Synthetic password reset destination</h1>",
    }),
  );
  await page.goto(`/auth/confirm#token_hash=${fake}&type=recovery`);
  await expect(page).toHaveURL(/\/auth\/confirm$/);
  expect(calls).toBe(0);
  await page.locator(".auth-panel form").evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
    (form as HTMLFormElement).requestSubmit();
  });
  await expect(page).toHaveURL(/\/reset-password$/);
  expect(calls).toBe(1);
});

test("legacy query links work without GET verification or automatic retry after failure", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/auth/confirm", async (route) => {
    calls++;
    await route.fulfill({
      status: 400,
      json: {
        error:
          "This link is invalid, expired or already used. Request a new email.",
      },
    });
  });
  await page.goto(`/auth/confirm?token_hash=${fake}&type=recovery`);
  await expect(page).toHaveURL(/\/auth\/confirm$/);
  expect(calls).toBe(0);
  await page
    .getByRole("button", { name: "Continue securely", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "expired or already used",
  );
  await expect(
    page.getByRole("button", { name: "Continue securely", exact: true }),
  ).toBeDisabled();
  expect(calls).toBe(1);
  await page.getByRole("link", { name: "Request a new reset email" }).click();
  await expect(
    page.getByRole("heading", { name: "Let’s get you back in." }),
  ).toBeVisible();
});

test("provider otp_expired errors never cause another verification call", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/auth/confirm", async (route) => {
    calls++;
    await route.abort();
  });
  await page.goto(
    `/auth/confirm#error=access_denied&error_code=otp_expired&error_description=${fake}`,
  );
  await expect(page).toHaveURL(/\/auth\/confirm$/);
  await page
    .getByRole("button", { name: "Continue securely", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("reported an expired");
  expect(calls).toBe(0);
  expect(await page.locator("body").innerText()).not.toContain(fake);
});
