import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const approved = process.env.MICMU_LAUNCH_APPROVED === "true";
  return {
    rules: {
      userAgent: "*",
      allow: approved ? "/" : undefined,
      disallow: approved
        ? ["/admin", "/dashboard", "/api", "/auth", "/login", "/reset-password"]
        : ["/"],
    },
    ...(approved && process.env.NEXT_PUBLIC_SITE_URL
      ? { sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml` }
      : {}),
  };
}
