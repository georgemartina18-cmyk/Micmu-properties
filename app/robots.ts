import type { MetadataRoute } from "next";
import {
  SITE_URL,
  indexingApproved,
  PRIVATE_PATHS,
  DRAFT_PATHS,
} from "@/lib/seo";
// Evaluate the launch gate at request time as well as during the build.
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: indexingApproved() ? "/" : undefined,
      disallow: indexingApproved() ? [...PRIVATE_PATHS, ...DRAFT_PATHS] : ["/"],
    },
    ...(indexingApproved() ? { sitemap: `${SITE_URL}/sitemap.xml` } : {}),
  };
}
