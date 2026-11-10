import type { Metadata } from "next";
import type { Settings } from "./types";
import { isDemo } from "./demo";
import launchConfig from "./launch-config.json";

// Canonical identity must never fall back to localhost or a deployment preview.
export const SITE_URL = "https://micmuproperties.com.ng";
export const BUSINESS_NAME = "MICMU Properties Limited";
export const PRIVATE_PATHS = [
  "/admin",
  "/dashboard",
  "/api",
  "/auth",
  "/login",
  "/reset-password",
  "/offline",
];
// These pages explicitly remain drafts until their actual text is reviewed.
export const DRAFT_PATHS = ["/privacy", "/terms"];
export function indexingApproved() {
  // Shared build/runtime default prevents an unset build variable from leaving
  // stale noindex headers after the authorised production launch.
  const configured = process.env.MICMU_LAUNCH_APPROVED;
  const approved =
    configured === undefined
      ? process.env.NODE_ENV === "production" &&
        launchConfig.publicIndexingEnabled
      : configured === "true";
  return approved && !isDemo();
}
export function publicMetadata(
  path: string,
  title: string,
  description: string,
): Metadata {
  const url = new URL(path, SITE_URL).href;
  return {
    title: path === "/" ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: BUSINESS_NAME,
      type: "website",
      locale: "en_NG",
    },
    ...(DRAFT_PATHS.includes(path)
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}
function safeSocialUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function businessStructuredData(info: Settings) {
  const facebook = safeSocialUrl(info.facebook);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: BUSINESS_NAME,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/brand/micmu-transparent.png`,
    ...(info.email?.trim() ? { email: info.email.trim() } : {}),
    ...(info.phone?.trim() ? { telephone: info.phone.trim() } : {}),
    ...(info.address?.trim() ? { address: info.address.trim() } : {}),
    ...(facebook ? { sameAs: [facebook] } : {}),
  };
}
export function serializeStructuredData(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
