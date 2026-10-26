import type { MetadataRoute } from "next";
import { properties, content } from "@/lib/data";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (
    process.env.MICMU_LAUNCH_APPROVED !== "true" ||
    !process.env.NEXT_PUBLIC_SITE_URL
  )
    return [];
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  const { items } = await properties();
  const dynamic = await Promise.all(
    [
      ["article", "news"],
      ["estate", "estates"],
      ["development", "developments"],
      ["business", "businesses"],
    ].map(async ([kind, route]) =>
      (await content(kind)).map((c) => `/${route}/${c.slug}`),
    ),
  );
  return [
    "/",
    "/about",
    "/properties",
    "/contact",
    "/faq",
    ...items.filter((p) => !p.demo).map((p) => `/properties/${p.slug}`),
    ...dynamic.flat(),
  ].map((path) => ({ url: `${base}${path}` }));
}
