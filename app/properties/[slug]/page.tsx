import { PropertyGallery } from "@/components/property-gallery";
import { RecentlyViewed } from "@/components/recently-viewed";
import { pricePeriod } from "@/lib/property-search";
import { notFound } from "next/navigation";
import Link from "next/link";
import { properties, money, settings } from "@/lib/data";
import { SaveProperty } from "@/components/save-property";
import { PageIntro } from "@/components/ui";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { items } = await properties();
  const p = items.find((p) => p.slug === slug);
  return { title: p?.name || "Property not found" };
}
export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { items, error } = await properties();
  if (error) throw new Error("Property data is temporarily unavailable.");
  const p = items.find((p) => p.slug === slug);
  if (!p) notFound();
  const info = await settings();
  return (
    <>
      <PageIntro
        eyebrow={`${p.category.toUpperCase()} / ${p.reference}`}
        title={p.name}
        description={p.location}
      />
      <div className="shell content-section">
        {p.demo && (
          <p className="notice">
            DEVELOPMENT SAMPLE · This fictional property is not a MICMU offer.
            Prices and features are illustrative. Inspection requests and saving
            are unavailable for samples.
          </p>
        )}
        <RecentlyViewed
          property={{ slug: p.slug, name: p.name, demo: Boolean(p.demo) }}
        />
        <PropertyGallery
          images={[
            ...new Set(
              [p.image_url, ...p.gallery_urls].filter((url): url is string =>
                Boolean(url),
              ),
            ),
          ]}
          name={p.name}
        />
        <div className="two-column" style={{ marginTop: 40 }}>
          <article className="prose">
            <h2>Space for possibility.</h2>
            <p>{p.description}</p>
            <div className="detail-stats">
              <span>
                PROPERTY TYPE<strong>{p.category}</strong>
              </span>
              <span>
                SIZE<strong>{p.size}</strong>
              </span>
              {p.bedrooms !== null && (
                <span>
                  BEDROOMS<strong>{p.bedrooms}</strong>
                </span>
              )}
              {p.bathrooms !== null && (
                <span>
                  BATHROOMS<strong>{p.bathrooms}</strong>
                </span>
              )}
              <span>
                AVAILABILITY<strong>{p.status}</strong>
              </span>
            </div>
            <h3>Location & listing details</h3>
            <p>
              {[p.state, p.lga, p.city, p.area].filter(Boolean).join(" → ")}
              <br />
              {p.purpose} · {p.furnishing} · Listed{" "}
              {new Date(p.listed_at).toLocaleDateString("en-NG")}
            </p>
            {p.latitude !== null && p.longitude !== null && (
              <a
                className="text-link"
                href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=16/${p.latitude}/${p.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open map & directions ↗
              </a>
            )}
            {(p.video_url || p.virtual_tour_url) && (
              <div className="actions-row">
                {p.video_url && (
                  <a
                    className="text-link"
                    href={p.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Watch property video ↗
                  </a>
                )}
                {p.virtual_tour_url && (
                  <a
                    className="text-link"
                    href={p.virtual_tour_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open virtual tour ↗
                  </a>
                )}
                <p className="form-note">
                  External media loads only when you choose to open it.
                </p>
              </div>
            )}
            <h3>Property features</h3>
            <div className="feature-list">
              {p.features.map((f) => (
                <span key={f}>{f}</span>
              ))}
            </div>
            <h3>Before you decide</h3>
            <p>
              Confirm current pricing, availability and all documentation
              directly with MICMU. Seek independent legal advice and verify land
              titles with the relevant government authorities.
            </p>
            <Link className="text-link" href="/verification">
              Check a MICMU reference ↗
            </Link>
          </article>
          <aside className="detail-aside">
            <p className="eyebrow">
              {p.demo ? "ILLUSTRATIVE PRICE" : "ASKING PRICE"}
            </p>
            <strong>
              {money(p.price)}
              {p.price !== null && pricePeriod(p)}
            </strong>
            <p>
              {p.demo
                ? "This sample is not for sale."
                : "Prices and availability are subject to confirmation."}
            </p>
            {!p.demo && (
              <>
                <SaveProperty id={p.id} />
                {p.status === "Available" && (
                  <Link
                    className="button"
                    href={`/book-inspection?property=${p.id}`}
                  >
                    Request an inspection ↗
                  </Link>
                )}
                {info.whatsapp && (
                  <a
                    className="button button-outline"
                    href={`https://wa.me/${info.whatsapp}?text=${encodeURIComponent(`Hello MICMU, I am interested in ${p.name} (${p.reference}). Please provide more information.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ask on WhatsApp ↗
                  </a>
                )}
              </>
            )}
            <Link href={`/contact?property=${p.id}`} className="text-link">
              Contact MICMU ↗
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}
