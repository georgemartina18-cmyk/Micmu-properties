import { pricePeriod } from "@/lib/property-search";
import Link from "next/link";
import { ArrowUpRight, MapPin, BedDouble, Expand } from "lucide-react";
import type { Property } from "@/lib/types";
import { money } from "@/lib/data";
export function PropertyCard({
  property: p,
  index = 0,
}: {
  property: Property;
  index?: number;
}) {
  return (
    <article className="property-card">
      <Link
        href={`/properties/${p.slug}`}
        className={`property-image property-image-${index % 3}`}
      >
        <span className="property-status">
          {p.demo ? "DEVELOPMENT SAMPLE" : p.status}
        </span>
        {/* Owned illustrations are placeholders; external approved photos must use the configured media pipeline. */}
        {p.image_url ? (
          <span
            className="approved-image"
            style={{ backgroundImage: `url(${JSON.stringify(p.image_url)})` }}
            role="img"
            aria-label={p.name}
          />
        ) : (
          <span
            className="illustration-image"
            role="img"
            aria-label="Architectural illustration, not a property photograph"
          />
        )}
        <span className="image-caption">
          {p.image_url
            ? "Approved property media"
            : "Architectural concept · not a photograph"}
        </span>
        <span className="card-arrow">
          <ArrowUpRight size={22} />
        </span>
      </Link>
      <div className="property-meta">
        <span>
          {p.category} · {p.purpose}
        </span>
        <span>{p.size}</span>
      </div>
      <h3>
        <Link href={`/properties/${p.slug}`}>{p.name}</Link>
      </h3>
      <p className="property-location">
        <MapPin size={14} />
        {p.location}
      </p>
      <div className="property-bottom">
        <strong>
          {money(p.price)}
          {p.price !== null && <small>{pricePeriod(p)}</small>}
          {p.demo && <small>Illustrative price</small>}
        </strong>
        <span>
          {p.bedrooms !== null ? (
            <>
              <BedDouble size={16} />
              {p.bedrooms} beds
            </>
          ) : (
            <>
              <Expand size={16} />
              {p.size}
            </>
          )}
        </span>
      </div>
    </article>
  );
}
