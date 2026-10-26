import { PropertyFilterForm } from "@/components/property-filters";
import { filterProperties } from "@/lib/property-search";
import { SaveSearch } from "@/components/saved-searches";
import type { Metadata } from "next";
import Link from "next/link";
import { properties } from "@/lib/data";
import { PropertyCard } from "@/components/property-card";
import { PageIntro, EmptyState } from "@/components/ui";
export const metadata: Metadata = { title: "Explore properties" };
export default async function Properties({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  const { items, error } = await properties();
  const filtered = filterProperties(items, q);
  return (
    <>
      <PageIntro
        eyebrow="THE PROPERTY COLLECTION"
        title="Find your next chapter."
        description="Explore the details. Refine your search. Make space for a considered decision."
      />
      <section className="shell content-section">
        <PropertyFilterForm key={JSON.stringify(q)} items={items} q={q} />
        <SaveSearch filters={q} />
        <div className="result-count">
          {filtered.length} {filtered.length === 1 ? "property" : "properties"}{" "}
          found{" "}
          <Link
            href="/properties"
            style={{ textDecoration: "underline", marginLeft: 16 }}
          >
            Clear filters
          </Link>
        </div>
        {items.some((p) => p.demo) && (
          <p className="sample-note">
            DEVELOPMENT SAMPLES ONLY · Fictional listings, locations and prices.
            Not available for sale or rent.
          </p>
        )}
        {error ? (
          <EmptyState title="We couldn’t load the collection">
            Please refresh or try again later.
          </EmptyState>
        ) : filtered.length ? (
          <div className="property-grid">
            {filtered.map((p, i) => (
              <PropertyCard key={p.id} property={p} index={i} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              items.length
                ? "No properties match your search"
                : "Verified listings are on their way"
            }
          >
            {items.length
              ? "Try a different location, category or budget."
              : "MICMU has not published any approved property records yet. Please return later."}
          </EmptyState>
        )}
      </section>
    </>
  );
}
