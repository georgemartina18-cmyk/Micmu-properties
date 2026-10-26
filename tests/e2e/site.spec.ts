import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("homepage, navigation, accessibility and no overflow", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "lasting",
  );
  await expect(
    page.getByText("DEVELOPMENT PREVIEW", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({
    path: `test-results/home-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test("property filters select actual sample records", async ({ page }) => {
  await page.goto("/properties");
  await page
    .getByRole("combobox", { name: "Property type", exact: true })
    .selectOption("Land");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("heading", { name: "The Garden Plots" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The Courtyard Residence" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "The Garden Plots" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The Garden Plots",
  );
  await expect(
    page.getByText("This fictional property", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Request an inspection" }),
  ).toHaveCount(0);
});
test("empty results have an honest recovery state", async ({ page }) => {
  await page.goto("/properties?min=99999999999");
  await expect(
    page.getByRole("heading", { name: "No properties match your search" }),
  ).toBeVisible();
});
test("Lite Mode persists and removes decorative imagery", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "MICMU Lite Mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-lite", "true");
  expect(
    await page
      .locator(".hero-visual")
      .evaluate((el) => getComputedStyle(el).backgroundImage),
  ).toBe("none");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-lite", "true");
});
test("forms do not pretend to save without a backend", async ({ page }) => {
  await page.goto("/book-inspection");
  await expect(
    page.getByText("Online submissions are not available yet.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Request an inspection" }),
  ).toBeDisabled();
});
test("private routes require login and invalid refs stay unverified", async ({
  page,
  request,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/dashboard/documents");
  await expect(page).toHaveURL(/\/login/);
  const response = await request.get(
    "/api/verify?type=property&reference=DEMO-001",
  );
  expect(response.status()).toBe(503);
  expect((await response.json()).error).toContain(
    "No reference has been verified",
  );
});
test("API rejects cross-origin writes and cannot confirm an unconfigured submission", async ({
  request,
}) => {
  const denied = await request.post("/api/enquiries", {
    headers: { origin: "https://attacker.example" },
    data: {},
  });
  expect(denied.status()).toBe(403);
  const unavailable = await request.post("/api/enquiries", {
    headers: { origin: "http://127.0.0.1:3000" },
    data: {},
  });
  expect(unavailable.status()).toBe(503);
});
test("mobile menu supports navigation", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Mobile navigation only");
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "About MICMU" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A considered perspective.",
  );
});

test("rental purpose, period and richer filters work together", async ({
  page,
}) => {
  await page.goto("/properties");
  await page
    .getByRole("combobox", { name: "Purpose", exact: true })
    .selectOption("For rent");
  await page
    .getByRole("combobox", { name: "State", exact: true })
    .selectOption("Lagos");
  await page
    .getByRole("combobox", { name: "LGA", exact: true })
    .selectOption("Ikeja");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("heading", { name: "The Terrace Apartment" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The Courtyard Residence" }),
  ).toHaveCount(0);
  await expect(page.getByText("/ year", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "The Terrace Apartment" }).click();
  await expect(
    page.getByText("For rent · Furnished", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("changing a parent location clears its child selections", async ({
  page,
}) => {
  await page.goto("/properties");
  await page
    .getByRole("combobox", { name: "State", exact: true })
    .selectOption("Lagos");
  await page
    .getByRole("combobox", { name: "LGA", exact: true })
    .selectOption("Ikeja");
  await page
    .getByRole("combobox", { name: "State", exact: true })
    .selectOption("Federal Capital Territory");
  await expect(
    page.getByRole("combobox", { name: "LGA", exact: true }),
  ).toHaveValue("");
  await expect(
    page
      .getByRole("combobox", { name: "LGA", exact: true })
      .getByRole("option", { name: "Ikeja", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "LGA", exact: true })
    .selectOption("Bwari");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("heading", { name: "The Garden Plots" }),
  ).toBeVisible();
});
test("saved searches honestly require a configured account", async ({
  page,
}) => {
  await page.goto("/properties?purpose=For+rent");
  await page.getByText("Save this search", { exact: true }).click();
  await page.getByLabel("Saved search name").fill("My rental search");
  await page.getByRole("button", { name: "Save search", exact: true }).click();
  await expect(
    page.getByText("Saved searches require a connected account service."),
  ).toBeVisible();
});
test("marketplace accessibility and offline-safe history behavior", async ({
  page,
}) => {
  await page.goto("/properties");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.goto("/properties/demonstration-terrace-apartment");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("micmu-recently-viewed") || "[]")[0],
      ),
    )
    .toBe("demonstration-terrace-apartment");
});
