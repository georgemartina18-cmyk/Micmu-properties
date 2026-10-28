import { PublicRealtorRegistration } from "@/components/realtor-controls";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageIntro, EmptyState, ContactBand } from "@/components/ui";
import { EnquiryForm } from "@/components/enquiry-form";
import { VerificationForm } from "@/components/verification-form";
import { pageDefinitions } from "@/lib/pages";
import { properties, settings, content } from "@/lib/data";
import { databaseConfigured } from "@/lib/supabase";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  return { title: pageDefinitions[page]?.eyebrow || "Page not found" };
}
export default async function PublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { page } = await params;
  const def = pageDefinitions[page];
  if (!def) notFound();
  const info = await settings();
  const formKind =
    page === "book-inspection"
      ? "inspection"
      : page === "become-a-realtor"
        ? "realtor"
        : page === "partnerships"
          ? "partnership"
          : page === "contact"
            ? "contact"
            : null;
  const configured =
    databaseConfigured() &&
    Boolean(
      process.env.SUPABASE_SECRET_KEY &&
      process.env.TURNSTILE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    );
  const q = await searchParams;
  return (
    <>
      <PageIntro {...def} />
      <section className="shell content-section">
        {page === "become-a-realtor" ? (
          <PublicRealtorRegistration />
        ) : formKind ? (
          <div className="two-column">
            <EnquiryForm
              kind={formKind}
              configured={configured}
              properties={
                formKind === "inspection" || formKind === "contact"
                  ? (await properties()).items
                  : []
              }
              selected={q.property}
            />
            <aside>
              <p className="eyebrow">A HUMAN CONVERSATION</p>
              <h3>We’re here for your questions.</h3>
              <p>
                Choose the details you would like MICMU to respond to. Never
                send bank details, identity documents or payment information
                through this form.
              </p>
              {info.phone && (
                <p>
                  <a
                    href={`tel:${info.phone.replace(/[^+0-9]/g, "")}`}
                    className="text-link"
                  >
                    {info.phone} ↗
                  </a>
                </p>
              )}
              {info.email && (
                <p>
                  <a href={`mailto:${info.email}`} className="text-link">
                    {info.email} ↗
                  </a>
                </p>
              )}
              {info.address && <p>{info.address}</p>}
              {!info.phone && !info.email && (
                <p className="notice">
                  Official contact details are awaiting MICMU approval. No phone
                  number or email address has been invented.
                </p>
              )}
              {info.whatsapp && (
                <a
                  className="text-link"
                  href={`https://wa.me/${info.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Talk on WhatsApp ↗
                </a>
              )}
            </aside>
          </div>
        ) : page === "about" ? (
          <div className="two-column">
            <article className="prose">
              <h2>Every story starts somewhere.</h2>
              {info.about ? (
                <p>{info.about}</p>
              ) : (
                <>
                  <p>
                    MICMU Properties Limited’s approved company profile, history
                    and leadership information have not yet been supplied.
                  </p>
                  <p>
                    This development website sets the foundation for an
                    authentic company story. Corporate credentials, achievements
                    and service commitments will be published only after
                    verification and approval.
                  </p>
                </>
              )}
              {info.mission && (
                <>
                  <h3>Our mission</h3>
                  <p>{info.mission}</p>
                </>
              )}
              {info.vision && (
                <>
                  <h3>Our vision</h3>
                  <p>{info.vision}</p>
                </>
              )}
              <ApprovedTeam />
              <Link href="/contact" className="text-link">
                Start a conversation ↗
              </Link>
            </article>
            <div
              className="approach-art"
              style={{ minHeight: 380 }}
              role="img"
              aria-label="Original architectural concept"
            >
              <div className="art-caption">
                <strong>
                  Space for
                  <br />
                  <em>what’s next.</em>
                </strong>
                <small>Illustrative brand concept</small>
              </div>
            </div>
          </div>
        ) : def.kind ? (
          <Collection kind={def.kind} page={page} />
        ) : page === "verification" || page === "representatives" ? (
          <div className="two-column">
            <VerificationForm
              type={page === "verification" ? "property" : "representative"}
            />
            <aside>
              <h3>One check. Part of a bigger picture.</h3>
              <p>
                {page === "verification"
                  ? "An internal MICMU record does not establish land ownership or replace independent title verification with the relevant government authorities."
                  : "An active representative record does not authorise collection of funds. Always confirm official payment instructions directly with the company."}
              </p>
              <p>No private customer information is exposed by this check.</p>
            </aside>
          </div>
        ) : page === "faq" ? (
          <div className="faq prose">
            {[
              [
                "How do I request an inspection?",
                "Choose an available, published property and use the inspection request form. Your visit is not confirmed until MICMU agrees the arrangements.",
              ],
              [
                "Are the demonstration properties real?",
                "No. Development samples are fictional, are not for sale and cannot be booked. They are excluded from production.",
              ],
              [
                "How do I verify a property?",
                "Use the official MICMU reference check for internal records, and independently verify land titles with the relevant government authorities. Obtain legal advice before proceeding.",
              ],
              [
                "What is MICMU Lite Mode?",
                "Use the leaf toggle in the navigation to reduce decorative imagery and motion. The preference is saved on your device. Forms and property information remain available.",
              ],
              [
                "Can I make payments on this website?",
                "No online payment processing is enabled. Never send payment information through enquiry forms.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
            {(await content("faq")).map((c) => (
              <details key={c.id}>
                <summary>{c.title}</summary>
                <p>{c.body}</p>
              </details>
            ))}
          </div>
        ) : page === "privacy" ? (
          <article className="prose">
            <p className="notice">
              Draft for professional review. The site must remain noindex and
              pre-launch until privacy operations and legal documents are
              approved.
            </p>
            <h2>Information you choose to share</h2>
            <p>
              Enquiry forms request your name, contact details and the
              information needed to respond. Inspection requests also include a
              property, preferred date and attendee count. Account functionality
              uses your email and authentication details.
            </p>
            <h3>Purpose and access</h3>
            <p>
              These details are used to respond to requests and manage the
              services you ask for. Authorised administrators can review
              submissions. Account data is restricted to the account owner and
              authorised staff.
            </p>
            <h3>Service providers and transfers</h3>
            <p>
              The proposed platform uses Cloudflare for hosting and security and
              Supabase for database and authentication. The company must confirm
              processing locations, contractual safeguards and any international
              transfer requirements under applicable Nigerian data protection
              law before launch.
            </p>
            <h3>Your choices</h3>
            <p>
              You may request access, correction or deletion of your
              information, subject to applicable legal requirements. MICMU must
              publish an approved privacy contact, retention schedule and
              complaint process before accepting live customer data.
            </p>
            <h3>Local device storage</h3>
            <p>
              Lite Mode saves one preference on your device. Recently viewed
              history stores up to 12 property references on this device and can
              be cleared from the account dashboard. Saved searches and
              favourites are stored in your account when configured.
              Authentication uses session cookies when configured. No
              advertising trackers or optional analytics are enabled. Private
              dashboards and personal information are not stored by the offline
              fallback.
            </p>
            <h3>Before launch</h3>
            <p>
              Required: approved controller identity and address, privacy
              contact, lawful bases, retention periods, rights process,
              supervisory authority information, processor agreements and
              professional legal review.
            </p>
          </article>
        ) : page === "terms" ? (
          <article className="prose">
            <p className="notice">
              Preliminary draft only. Company-specific terms and professional
              review are required before launch.
            </p>
            <h2>Website information</h2>
            <p>
              Property information is an invitation to enquire and does not
              constitute a binding sale offer. Availability, pricing and
              documents require direct confirmation. No fictional development
              record is a real listing.
            </p>
            <h3>Inspection requests</h3>
            <p>
              A saved inspection request is pending review. It is not a
              confirmed appointment or reservation.
            </p>
            <h3>Independent advice</h3>
            <p>
              Internal reference verification does not establish legal
              ownership. Seek independent legal and professional advice before
              entering a transaction.
            </p>
            <h3>Accounts and acceptable use</h3>
            <p>
              Protect your sign-in details. Do not attempt unauthorised access,
              submit false information or upload unlawful content. Access to
              private records is limited to authorised users.
            </p>
            <h3>Outstanding legal decisions</h3>
            <p>
              MICMU must approve the contracting entity details, jurisdiction,
              dispute process, liability provisions, cancellation policies and
              legally required consumer disclosures before public launch.
            </p>
          </article>
        ) : (
          <EmptyState title="No approved vacancies published">
            Visit again for company-approved opportunities.
          </EmptyState>
        )}
      </section>
      {["about", "businesses", "estates", "developments"].includes(page) && (
        <ContactBand />
      )}
    </>
  );
}
async function Collection({ kind, page }: { kind: string; page: string }) {
  const items = await content(kind);
  return items.length ? (
    <div className="record-list">
      {items.map((c) => (
        <article className="record" key={c.id}>
          <small>{kind.toUpperCase()}</small>
          <h3>{c.title}</h3>
          <p>{c.summary}</p>
          <Link href={`/${page}/${c.slug}`} className="text-link">
            Read more ↗
          </Link>
        </article>
      ))}
    </div>
  ) : (
    <EmptyState title="Approved information is on its way">
      This section will show only content reviewed and published by MICMU.
      Unconfirmed services and developments remain unpublished.
    </EmptyState>
  );
}

async function ApprovedTeam() {
  const team = await content("team");
  return team.length ? (
    <section id="team" aria-label="Approved team profiles">
      <h3>Meet the team</h3>
      {team
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((person) => (
          <div className="record" key={person.id}>
            {person.image_url && (
              // Approved, same-origin static media; no remote transformation service.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={person.image_url}
                alt={person.title}
                width={240}
                height={280}
                loading="lazy"
                style={{ objectFit: "cover", maxWidth: "100%" }}
              />
            )}
            <h3>{person.title}</h3>
            <p>{person.summary}</p>
            <p>{person.body}</p>
          </div>
        ))}
    </section>
  ) : null;
}
