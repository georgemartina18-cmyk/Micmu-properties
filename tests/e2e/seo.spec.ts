import { test, expect } from "@playwright/test";
const site = "https://micmuproperties.com.ng";
const approved = process.env.MICMU_LAUNCH_APPROVED === "true";

test("public metadata, business identity and launch gate", async ({
  page,
  request,
}) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /^https:\/\/micmuproperties\.com\.ng\/?$/,
  );
  await expect(page).toHaveTitle(
    "MICMU Properties Limited | Property sales and rentals",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /published properties/,
  );
  const business = JSON.parse(
    await page.locator('script[type="application/ld+json"]').innerText(),
  );
  expect(business).toMatchObject({
    "@type": "Organization",
    name: "MICMU Properties Limited",
    url: `${site}/`,
  });
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    approved ? "index, follow" : "noindex, nofollow",
  );
  // Alternate/local hosts remain excluded even with public launch enabled.
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  const canonicalHost = await request.get("/", {
    headers: { Host: "micmuproperties.com.ng" },
  });
  if (approved) expect(canonicalHost.headers()["x-robots-tag"]).toBeUndefined();
  else expect(canonicalHost.headers()["x-robots-tag"]).toContain("noindex");
  const www = await request.get("/about?source=test", {
    headers: { Host: "www.micmuproperties.com.ng" },
    maxRedirects: 0,
  });
  expect(www.status()).toBe(308);
  expect(www.headers().location).toBe(`${site}/about?source=test`);
});

test("public route metadata is distinct; private routes and legal drafts remain excluded", async ({
  page,
  request,
}) => {
  for (const [path, title] of [
    ["/about", "About MICMU"],
    ["/contact", "Contact MICMU"],
    ["/properties?purpose=rent", "Properties for sale and rent"],
    ["/payment-plans", "Property payment plans"],
  ]) {
    await page.goto(path);
    await expect(page).toHaveTitle(`${title} | MICMU Properties Limited`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      site + path.split("?")[0],
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /.+/,
    );
  }
  for (const path of [
    "/login",
    "/dashboard",
    "/admin/staff",
    "/auth/confirm",
    "/reset-password",
    "/api/staff",
    "/privacy",
    "/terms",
    "/offline",
  ]) {
    const response = await request.get(path, {
      headers: { Host: "micmuproperties.com.ng" },
      maxRedirects: 0,
    });
    expect(response.headers()["x-robots-tag"], path).toContain("noindex");
  }
  await page.goto("/login");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  const missing = await page.goto("/not-a-real-micmu-page");
  expect(missing?.status()).toBe(404);
  const directives = await page
    .locator('meta[name="robots"]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("content")));
  expect(directives.some((value) => value?.includes("noindex"))).toBe(true);
});

test("robots and sitemap agree with launch approval and exclude private routes", async ({
  request,
}) => {
  const rules = await request.get("/robots.txt");
  const text = await rules.text();
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();
  if (approved) {
    expect(text).toContain(`Sitemap: ${site}/sitemap.xml`);
    expect(text).toContain("Allow: /");
    expect(xml).toContain(`${site}/developments`);
    expect(xml).toContain(`${site}/properties`);
    for (const path of [
      "/admin",
      "/dashboard",
      "/auth",
      "/api",
      "/login",
      "/reset-password",
      "/privacy",
      "/terms",
    ]) {
      expect(text).toContain(`Disallow: ${path}`);
      expect(xml).not.toContain(`<loc>${site}${path}`);
    }
  } else {
    expect(text).toContain("Disallow: /");
    expect(text).not.toContain("Sitemap:");
    expect(xml).not.toContain("<loc>");
  }
});
