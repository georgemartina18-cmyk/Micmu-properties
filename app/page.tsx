import Link from "next/link";
import { RenderingGallery } from "@/components/rendering-gallery";
import {
  ArrowUpRight,
  ArrowRight,
  MoveDown,
  ShieldCheck,
  ScanLine,
  Leaf,
} from "lucide-react";
import { properties, settings, content } from "@/lib/data";
import { PropertyCard } from "@/components/property-card";
import { EmptyState, ContactBand } from "@/components/ui";
export default async function Home() {
  const [{ items, error }, info, testimonials] = await Promise.all([
    properties(),
    settings(),
    content("testimonial"),
  ]);
  const featured = items.filter((p) => p.featured);
  const collection = featured.length
    ? featured
    : [...items].sort((a, b) => b.listed_at.localeCompare(a.listed_at));
  const latest = items
    .filter((p) => !p.featured)
    .sort((a, b) => b.listed_at.localeCompare(a.listed_at))
    .slice(0, 3);
  return (
    <>
      <section className="hero">
        <div
          className="hero-visual"
          role="img"
          aria-label="Original architectural concept illustration; not a MICMU development"
        />
        <div className="hero-shade" />
        <div className="shell hero-content">
          <p className="eyebrow light">
            <span /> A CONSIDERED APPROACH TO PROPERTY
          </p>
          <h1>
            {info.hero_title ? (
              <span style={{ whiteSpace: "pre-line" }}>{info.hero_title}</span>
            ) : (
              <>
                More than a place.
                <br />A <em>lasting</em> perspective.
              </>
            )}
          </h1>
          <p className="hero-description" style={{ whiteSpace: "pre-line" }}>
            {info.hero_description ||
              "Discover what comes next.\nThoughtful spaces. Clear information. Your next chapter."}
          </p>
          <div className="hero-buttons">
            <Link href="/properties" className="button button-gold">
              Explore properties <ArrowUpRight size={19} />
            </Link>
            <Link href="/book-inspection" className="hero-secondary">
              Arrange an inspection <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
        <div className="shell hero-foot">
          <a href="#discover">
            <MoveDown size={17} /> SCROLL TO DISCOVER
          </a>
          <span>ARCHITECTURAL CONCEPT / ORIGINAL ILLUSTRATION</span>
          <span>CONCEPT / 01</span>
        </div>
      </section>
      <div className="shell search-wrap">
        <form action="/properties" className="home-search">
          <div className="search-intro">
            <span className="eyebrow">FIND YOUR NEXT</span>
            <strong>A place to begin.</strong>
          </div>
          <label>
            LOCATION
            <select name="location">
              <option value="">All locations</option>
              {[...new Set(items.map((p) => p.location.split(" · ")[0]))].map(
                (location) => (
                  <option key={location}>{location}</option>
                ),
              )}
            </select>
          </label>
          <label>
            PROPERTY TYPE
            <select name="category">
              <option value="">All property types</option>
              <option>Land</option>
              <option>House</option>
              <option>Apartment</option>
            </select>
          </label>
          <label>
            YOUR BUDGET
            <select name="max">
              <option value="">Any budget</option>
              <option value="50000000">Up to ₦50 million</option>
              <option value="100000000">Up to ₦100 million</option>
              <option value="200000000">Up to ₦200 million</option>
            </select>
          </label>
          <button className="button">
            Find a property <ArrowUpRight size={18} />
          </button>
        </form>
      </div>
      <section className="section shell introduction" id="discover">
        <div>
          <p className="eyebrow">THE MICMU PERSPECTIVE</p>
          <h2>
            {info.intro_title ? (
              <span style={{ whiteSpace: "pre-line" }}>{info.intro_title}</span>
            ) : (
              <>
                Property is personal.
                <br />
                So is <em>your next step.</em>
              </>
            )}
          </h2>
        </div>
        <div className="introduction-copy">
          {!info.intro_body && (
            <p className="large-copy">
              A home. A new beginning.
              <br />
              Something to build on.
            </p>
          )}
          <p style={{ whiteSpace: "pre-line" }}>
            {info.intro_body ||
              "Every property decision deserves time, clear information, and the right questions. Explore the possibilities, understand the details, and make room for what matters to you."}
          </p>
          <Link href="/about" className="text-link">
            Get to know MICMU <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <RenderingGallery />
      <section className="section properties-section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {featured.length ? "FEATURED PROPERTIES" : "LATEST PROPERTIES"}
              </p>
              <h2>
                Find your <em>next chapter.</em>
              </h2>
            </div>
            <Link href="/properties" className="text-link">
              Explore all properties <ArrowUpRight size={18} />
            </Link>
          </div>
          {error ? (
            <EmptyState title="Listings are temporarily unavailable">
              Please try again shortly.
            </EmptyState>
          ) : items.length ? (
            <>
              {items.some((p) => p.demo) && (
                <p className="sample-note">
                  Development samples · fictional listings and illustrative
                  prices · not for sale or rent
                </p>
              )}
              <div className="property-grid">
                {collection.slice(0, 3).map((p, i) => (
                  <PropertyCard key={p.id} property={p} index={i} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="A portfolio worth waiting for">
              Verified listings and approved photography will appear here when
              published by MICMU.
            </EmptyState>
          )}
        </div>
      </section>
      {featured.length > 0 && latest.length > 0 && (
        <section className="shell section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LATEST PROPERTIES</p>
              <h2>
                New to <em>the collection.</em>
              </h2>
            </div>
            <Link href="/properties?sort=newest" className="text-link">
              View the latest ↗
            </Link>
          </div>
          <div className="property-grid">
            {latest.map((p, i) => (
              <PropertyCard key={p.id} property={p} index={i} />
            ))}
          </div>
        </section>
      )}
      <section className="shell property-paths" aria-label="Browse by purpose">
        <Link href="/properties?purpose=For+sale">
          <p className="eyebrow">A PLACE TO OWN</p>
          <h2>Properties for sale ↗</h2>
          <p>Browse published sale listings.</p>
        </Link>
        <Link href="/properties?purpose=For+rent">
          <p className="eyebrow">A PLACE FOR NOW</p>
          <h2>Properties for rent ↗</h2>
          <p>Find rentals with clearly stated price periods.</p>
        </Link>
        {items.length > 0 && (
          <div className="span-full">
            <p className="eyebrow">EXPLORE LISTED LOCATIONS</p>
            <div className="tabs">
              {[...new Set(items.map((p) => p.state).filter(Boolean))].map(
                (state) => (
                  <Link
                    key={state}
                    href={`/properties?state=${encodeURIComponent(state)}`}
                  >
                    {state} ↗
                  </Link>
                ),
              )}
            </div>
          </div>
        )}
      </section>
      <section className="approach-section">
        <div className="approach-art">
          <div className="art-caption">
            <span>DESIGN FOR THE WAY YOU LIVE</span>
            <strong>
              Room for
              <br />
              <em>possibility.</em>
            </strong>
            <small>Original architectural concept</small>
          </div>
        </div>
        <div className="approach-copy">
          <p className="eyebrow">A CLEARER WAY FORWARD</p>
          <h2>
            Confidence begins
            <br />
            with <em>clarity.</em>
          </h2>
          <p className="muted">
            A few principles to guide your property journey.
          </p>
          {[
            [
              ShieldCheck,
              "Ask for the details",
              "Review current availability, price and documentation before making a commitment.",
            ],
            [
              ScanLine,
              "Verify independently",
              "Check land titles with the relevant authorities and seek independent professional advice.",
            ],
            [
              Leaf,
              "Explore at your pace",
              "Use MICMU Lite Mode for a quieter, lower-data browsing experience.",
            ],
          ].map(([Icon, title, copy]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <div className="principle" key={String(title)}>
                <I size={23} />
                <div>
                  <h3>{String(title)}</h3>
                  <p>{String(copy)}</p>
                </div>
              </div>
            );
          })}
          <Link href="/verification" className="text-link">
            Understand property verification <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      <section className="section shell journey">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FROM INTEREST TO OWNERSHIP</p>
            <h2>
              A journey.
              <br />
              <em>Considered at every step.</em>
            </h2>
          </div>
          <p className="muted">
            A general guide to buying property.
            <br />
            Your transaction may involve additional steps.
          </p>
        </div>
        <div className="journey-grid">
          {[
            [
              "Discover",
              "Explore published properties and shortlist your options.",
            ],
            ["Inspect", "Request a visit. MICMU will confirm arrangements."],
            ["Verify", "Review documents with independent advisers."],
            [
              "Move forward",
              "Agree terms and complete the necessary legal documentation.",
            ],
          ].map(([title, copy], i) => (
            <div className="journey-step" key={title}>
              <span>
                0{i + 1}
                <ArrowRight size={20} />
              </span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          ))}
        </div>
      </section>
      {testimonials.length > 0 && (
        <section
          className="shell section"
          aria-label="Approved customer testimonials"
        >
          <p className="eyebrow">IN THEIR OWN WORDS</p>
          <h2>Client perspectives.</h2>
          <div className="testimonial-grid">
            {testimonials.map((t) => (
              <figure key={t.id}>
                <blockquote>{t.body}</blockquote>
                <figcaption>
                  {t.title}
                  {t.summary && <small>{t.summary}</small>}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
      <ContactBand />
    </>
  );
}
