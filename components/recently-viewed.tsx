"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
const key = "micmu-recently-viewed";
function read(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? value
          .filter((v) => typeof v === "string" && /^[a-z0-9-]{1,160}$/.test(v))
          .slice(0, 12)
      : [];
  } catch {
    return [];
  }
}
export function RecentlyViewed({
  property,
}: {
  property: { slug: string; name: string; demo: boolean };
}) {
  useEffect(() => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(
          [property.slug, ...read().filter((s) => s !== property.slug)].slice(
            0,
            12,
          ),
        ),
      );
    } catch {
      /* Optional on-device history. */
    }
  }, [property.slug]);
  return null;
}
export function RecentlyViewedList({
  items,
}: {
  items: { slug: string; name: string }[];
}) {
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => {
    queueMicrotask(() => setSlugs(read()));
  }, []);
  const records = slugs.flatMap((slug) => items.filter((p) => p.slug === slug));
  return (
    <div className="record-list">
      <p className="form-note">
        History is stored only on this device. Only properties that are
        currently published are shown; prices are reloaded when you open a
        property.
      </p>
      {records.length ? (
        records.map((p) => (
          <article className="record" key={p.slug}>
            <h3>
              <Link href={`/properties/${p.slug}`}>{p.name}</Link>
            </h3>
            <Link className="text-link" href={`/properties/${p.slug}`}>
              View current details ↗
            </Link>
          </article>
        ))
      ) : (
        <p>No recently viewed properties on this device.</p>
      )}
      <button
        className="button button-outline"
        onClick={() => {
          try {
            localStorage.removeItem(key);
          } catch {
            /* Storage may be disabled. */
          }
          setSlugs([]);
        }}
      >
        Clear this device’s history
      </button>
    </div>
  );
}
