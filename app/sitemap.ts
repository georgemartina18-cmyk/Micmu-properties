import type { MetadataRoute } from "next";
import { properties, content } from "@/lib/data";
import { SITE_URL, indexingApproved, DRAFT_PATHS } from "@/lib/seo";
import { publicPageSeo } from "@/lib/seo-pages";
// Avoid caching an empty build-time sitemap or stale/archived inventory.
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexingApproved()) return [];
  const { items, error } = await properties();
  if (error) throw new Error("Sitemap inventory is temporarily unavailable.");
  const dynamic = await Promise.all(
    [
      ["article", "news"],
      ["estate", "estates"],
      ["development", "developments"],
      ["business", "businesses"],
    ].map(async ([kind, route]) =>
      (await content(kind)).map(
        (c) => `/${route}/${encodeURIComponent(c.slug)}`,
      ),
    ),
  );
  return [
    ...new Set([
      "/",
      "/properties",
      "/payment-plans",
      ...Object.keys(publicPageSeo)
        .map((page) => `/${page}`)
        .filter((path) => !DRAFT_PATHS.includes(path)),
      ...items
        .filter((p) => !p.demo)
        .map((p) => `/properties/${encodeURIComponent(p.slug)}`),
      ...dynamic.flat(),
    ]),
  ].map((path) => ({ url: new URL(path, SITE_URL).href }));
}
