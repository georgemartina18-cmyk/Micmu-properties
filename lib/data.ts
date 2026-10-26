import { database } from "./supabase";
import { demoProperties, isDemo } from "./demo";
import type { Property, Content, Settings } from "./types";
export async function properties(): Promise<{
  items: Property[];
  error: boolean;
}> {
  const db = await database();
  if (!db) return { items: isDemo() ? demoProperties : [], error: false };
  const { data, error } = await db
    .from("properties")
    .select("*")
    .eq("published", true)
    .eq("review_status", "Approved")
    .is("archived_at", null)
    .order("listed_at", { ascending: false });
  return { items: (data ?? []) as Property[], error: Boolean(error) };
}
export async function content(kind: string): Promise<Content[]> {
  const db = await database();
  if (!db) return [];
  const { data, error } = await db
    .from("content")
    .select("*")
    .eq("kind", kind)
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (error)
    throw new Error("Content is temporarily unavailable. Please try again.");
  return (data ?? []) as Content[];
}
export async function settings(): Promise<Settings> {
  const db = await database();
  if (!db) return { facebook: "https://www.facebook.com/micmuproperties1" };
  const { data } = await db
    .from("site_settings")
    .select("value")
    .eq("id", "public")
    .maybeSingle();
  return {
    facebook: "https://www.facebook.com/micmuproperties1",
    ...(data?.value ?? {}),
  } as Settings;
}
export const money = (value: number | null) =>
  value === null
    ? "Price on request"
    : new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }).format(value);
