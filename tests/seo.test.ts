import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/data", () => ({ properties: vi.fn(), content: vi.fn() }));
import { properties, content } from "@/lib/data";
import {
  SITE_URL,
  indexingApproved,
  publicMetadata,
  businessStructuredData,
  serializeStructuredData,
  PRIVATE_PATHS,
  DRAFT_PATHS,
} from "@/lib/seo";
import { publicPageSeo } from "@/lib/seo-pages";
import { pageDefinitions } from "@/lib/pages";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import config from "../next.config";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("Search indexing controls", () => {
  it("fails closed until the exact launch setting is true, and never indexes demo mode", async () => {
    for (const value of [undefined, "false", "TRUE", "1"]) {
      vi.stubEnv("MICMU_LAUNCH_APPROVED", value);
      expect(indexingApproved()).toBe(false);
      expect(robots().rules).toMatchObject({ disallow: ["/"] });
      expect(await sitemap()).toEqual([]);
    }
    vi.stubEnv("MICMU_LAUNCH_APPROVED", "true");
    vi.stubEnv("MICMU_DEMO_MODE", "true");
    expect(indexingApproved()).toBe(false);
    expect(properties).not.toHaveBeenCalled();
  });
  it("opens public crawling only, advertises the canonical sitemap, and normalizes site identity", () => {
    vi.stubEnv("MICMU_LAUNCH_APPROVED", "true");
    vi.stubEnv("MICMU_DEMO_MODE", "false");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000/wrong/");
    expect(robots()).toMatchObject({
      sitemap: `${SITE_URL}/sitemap.xml`,
      rules: { allow: "/", disallow: [...PRIVATE_PATHS, ...DRAFT_PATHS] },
    });
    expect(
      publicMetadata("/properties", "Properties", "Description").alternates,
    ).toEqual({ canonical: `${SITE_URL}/properties` });
    expect(publicMetadata("/", "Home", "Description").title).toEqual({
      absolute: "Home",
    });
  });
  it("always retains noindex response headers for accounts, APIs and draft legal pages after launch", async () => {
    vi.stubEnv("MICMU_LAUNCH_APPROVED", "true");
    vi.stubEnv("MICMU_DEMO_MODE", "false");
    const headers = await config.headers!();
    expect(
      headers.find((r) => r.source === "/:path*")?.headers,
    ).not.toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" });
    for (const path of [...PRIVATE_PATHS, ...DRAFT_PATHS]) {
      expect(
        headers.find((r) => r.source === `${path}/:path*`)?.headers,
      ).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" });
    }
    expect(publicMetadata("/privacy", "Draft", "Draft").robots).toEqual({
      index: false,
      follow: false,
    });
  });
  it("gives every generic public route distinct metadata", () => {
    expect(Object.keys(publicPageSeo).sort()).toEqual(
      Object.keys(pageDefinitions).sort(),
    );
    expect(new Set(Object.values(publicPageSeo).map((p) => p.title)).size).toBe(
      Object.keys(publicPageSeo).length,
    );
    for (const page of Object.values(publicPageSeo))
      expect(page.description.length).toBeGreaterThan(50);
  });
  it("includes all public routes and only published real inventory, without account or draft URLs", async () => {
    vi.stubEnv("MICMU_LAUNCH_APPROVED", "true");
    vi.stubEnv("MICMU_DEMO_MODE", "false");
    vi.mocked(properties).mockResolvedValue({
      items: [
        { slug: "real-listing" },
        { slug: "sample", demo: true },
      ] as never,
      error: false,
    });
    vi.mocked(content).mockImplementation(
      async (kind) => [{ slug: `${kind}-update` }] as never,
    );
    const urls = (await sitemap()).map((item) => item.url);
    expect(urls).toContain(`${SITE_URL}/properties/real-listing`);
    expect(urls).toContain(`${SITE_URL}/news/article-update`);
    expect(urls).toContain(`${SITE_URL}/developments`);
    expect(urls).toContain(`${SITE_URL}/payment-plans`);
    expect(urls.some((url) => url.includes("sample"))).toBe(false);
    for (const path of [...PRIVATE_PATHS, ...DRAFT_PATHS])
      expect(urls).not.toContain(`${SITE_URL}${path}`);
    expect(new Set(urls).size).toBe(urls.length);
  });
  it("does not publish a successful but misleading sitemap when inventory cannot load", async () => {
    vi.stubEnv("MICMU_LAUNCH_APPROVED", "true");
    vi.stubEnv("MICMU_DEMO_MODE", "false");
    vi.mocked(properties).mockResolvedValue({ items: [], error: true });
    await expect(sitemap()).rejects.toThrow("temporarily unavailable");
  });
  it("uses supplied business facts without inventing ratings, office hours or addresses and safely serializes JSON-LD", () => {
    const minimal = businessStructuredData({ facebook: "javascript:alert(1)" });
    expect(minimal).not.toHaveProperty("address");
    expect(minimal).not.toHaveProperty("sameAs");
    expect(minimal).not.toHaveProperty("aggregateRating");
    expect(minimal).not.toHaveProperty("openingHours");
    const business = businessStructuredData({
      email: "hello@example.test",
      phone: "+2341234567",
      address: "Approved address",
      facebook: "https://www.facebook.com/micmuproperties1",
    });
    expect(business).toMatchObject({
      "@type": "Organization",
      url: `${SITE_URL}/`,
      address: "Approved address",
      email: "hello@example.test",
    });
    const json = serializeStructuredData({
      value: "</script><script>alert(1)</script>",
    });
    expect(json).not.toContain("<");
    expect(JSON.parse(json).value).toContain("</script>");
  });
});
