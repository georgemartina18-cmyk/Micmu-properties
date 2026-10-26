import { NotificationList } from "@/components/notifications";
import { SavedSearchList } from "@/components/saved-searches";
import { RecentlyViewedList } from "@/components/recently-viewed";
import { SaveProperty } from "@/components/save-property";
import { properties } from "@/lib/data";
import { MfaForm } from "@/components/mfa-form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PageIntro, EmptyState } from "@/components/ui";
import { SignOut, ProfileForm } from "@/components/account-controls";
import { EnquiryForm } from "@/components/enquiry-form";
import { PropertyCard } from "@/components/property-card";
import { money } from "@/lib/data";
import type { Property } from "@/lib/types";
export const metadata = {
  title: "Your dashboard",
  robots: { index: false, follow: false },
};
export default async function Dashboard({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { db, user } = await requireUser();
  const { section = [] } = await params;
  const tab = section[0] || "overview";
  if (
    section.length > 1 ||
    ![
      "overview",
      "saved",
      "inspections",
      "documents",
      "payments",
      "profile",
      "support",
      "realtor",
      "security",
      "searches",
      "notifications",
      "recent",
    ].includes(tab)
  )
    notFound();
  const { data: roles } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const isAdmin = roles?.some((r) => r.role === "admin");
  const realtor = roles?.some((r) => r.role === "realtor");
  return (
    <>
      <PageIntro
        eyebrow="YOUR MICMU"
        title="Welcome to your space."
        description="Your information, your requests and your next steps."
      />
      <section className="shell content-section">
        <nav className="tabs" aria-label="Account sections">
          {[
            ["overview", "Overview"],
            ["saved", "Saved properties"],
            ["searches", "Saved searches"],
            ["notifications", "Notifications"],
            ["recent", "Recently viewed"],
            ["inspections", "Inspections"],
            ["documents", "Documents"],
            ["payments", "Payment records"],
            ["profile", "Profile"],
            ["security", "Account security"],
            ["support", "Support"],
            ...(realtor ? [["realtor", "Realtor portal"]] : []),
          ].map(([key, label]) => (
            <Link
              key={key}
              href={`/dashboard/${key === "overview" ? "" : key}`}
              aria-current={key === tab ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
          {isAdmin && <Link href="/admin">Administration ↗</Link>}
        </nav>
        {tab === "overview" ? (
          <div className="two-column">
            <article className="prose">
              <h2>Your next step, in one place.</h2>
              <p>
                Signed in as {user.email}. Your inspection requests remain
                pending until an authorised administrator confirms them.
              </p>
              <Link className="text-link" href="/properties">
                Explore properties ↗
              </Link>
              <div style={{ marginTop: 30 }}>
                <SignOut />
              </div>
            </article>
            <aside>
              <h3>A note on your information</h3>
              <p>
                Keep your contact details up to date. Never share your password
                or send sensitive documents through the public enquiry forms.
              </p>
            </aside>
          </div>
        ) : tab === "security" ? (
          <MfaForm
            factorId={
              (await db.auth.mfa.listFactors()).data?.totp.find(
                (f) => f.status === "verified",
              )?.id
            }
          />
        ) : tab === "profile" ? (
          <ProfileForm
            name={
              (
                await db
                  .from("profiles")
                  .select("full_name")
                  .eq("id", user.id)
                  .maybeSingle()
              ).data?.full_name || ""
            }
          />
        ) : tab === "notifications" ? (
          <NotificationList
            items={await (async () => {
              const { data, error } = await db
                .from("notifications")
                .select("id,title,message,href,read_at")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(100);
              if (error) throw new Error("Notifications could not be loaded.");
              return data || [];
            })()}
          />
        ) : tab === "searches" ? (
          <SavedSearchList
            items={await (async () => {
              const { data, error } = await db
                .from("saved_searches")
                .select("id,name,filters")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });
              if (error) throw new Error("Saved searches could not be loaded.");
              return data || [];
            })()}
          />
        ) : tab === "recent" ? (
          <RecentlyViewedList
            items={(await properties()).items.map((p) => ({
              slug: p.slug,
              name: p.name,
            }))}
          />
        ) : tab === "saved" ? (
          <Saved userId={user.id} />
        ) : tab === "inspections" ? (
          <Records table="enquiries" userId={user.id} kind="inspection" />
        ) : tab === "documents" ? (
          <Documents userId={user.id} />
        ) : tab === "payments" ? (
          <Payments userId={user.id} />
        ) : tab === "support" ? (
          <>
            <Records table="enquiries" userId={user.id} kind="support" />
            <EnquiryForm
              kind="support"
              configured={Boolean(
                process.env.SUPABASE_SECRET_KEY &&
                process.env.TURNSTILE_SECRET_KEY &&
                process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
              )}
            />
          </>
        ) : realtor ? (
          <Realtor userId={user.id} />
        ) : (
          <EmptyState title="Realtor access requires approval">
            Apply through the realtor application form. Only administrators can
            grant access.
          </EmptyState>
        )}
      </section>
    </>
  );
}
async function Saved({ userId }: { userId: string }) {
  const { db } = await requireUser();
  const { data, error } = await db
    .from("saved_properties")
    .select("property_id, properties(*)")
    .eq("user_id", userId);
  if (error) throw new Error("Your shortlist could not be loaded.");
  const items = (data || [])
    .flatMap((r) =>
      Array.isArray(r.properties) ? r.properties : [r.properties],
    )
    .filter(Boolean) as Property[];
  return items.length ? (
    <div className="property-grid">
      {items.map((p) => (
        <div key={p.id}>
          <PropertyCard property={p} />
          <SaveProperty id={p.id} remove />
        </div>
      ))}
    </div>
  ) : (
    <EmptyState title="Your shortlist starts here">
      Save an approved property to find it here later.
    </EmptyState>
  );
}
async function Records({
  userId,
  kind,
}: {
  table: string;
  userId: string;
  kind: string;
}) {
  const { db } = await requireUser();
  const { data, error } = await db
    .from("enquiries")
    .select("id,kind,status,created_at,payload")
    .eq("user_id", userId)
    .eq("kind", kind)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Your requests could not be loaded.");
  return data?.length ? (
    <div className="record-list">
      {data.map((r) => (
        <article className="record" key={r.id}>
          <small>{r.id}</small>
          <h3>
            {r.kind === "inspection" ? "Inspection request" : "Support request"}{" "}
            · {r.status}
          </h3>
          <p>
            {r.payload.date &&
              `Requested: ${r.payload.date} at ${r.payload.time} (Nigeria)`}
          </p>
          <p>{r.payload.message}</p>
          <small>
            Submitted {new Date(r.created_at).toLocaleDateString("en-NG")}
          </small>
          {r.kind === "inspection" && (
            <p>
              To reschedule, send a support request with this reference. A
              requested time is not a confirmed appointment.
            </p>
          )}
        </article>
      ))}
    </div>
  ) : (
    <EmptyState title="No requests yet">
      Your recorded requests will appear here.
    </EmptyState>
  );
}
async function Documents({ userId }: { userId: string }) {
  const { db } = await requireUser();
  const { data, error } = await db
    .from("client_documents")
    .select("id,title,storage_path")
    .eq("user_id", userId);
  if (error) throw new Error("Documents could not be loaded.");
  if (!data?.length)
    return (
      <EmptyState title="No approved documents">
        Documents assigned to your account will appear here.
      </EmptyState>
    );
  return (
    <div className="record-list">
      {await Promise.all(
        data.map(async (d) => {
          const { data: signed } = await db.storage
            .from("client-documents")
            .createSignedUrl(d.storage_path, 60);
          return (
            <article className="record" key={d.id}>
              <h3>{d.title}</h3>
              {signed ? (
                <a
                  href={signed.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  Open secure document ↗
                </a>
              ) : (
                <p>Document unavailable. Please contact support.</p>
              )}
            </article>
          );
        }),
      )}
    </div>
  );
}
async function Payments({ userId }: { userId: string }) {
  const { db } = await requireUser();
  const { data, error } = await db
    .from("payment_records")
    .select("id,reference,amount,status,created_at")
    .eq("user_id", userId);
  if (error) throw new Error("Payment records could not be loaded.");
  return data?.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id}>
              <td>{r.reference}</td>
              <td>{money(r.amount)}</td>
              <td>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <EmptyState title="No payment records">
      Administrator-approved records will appear here. No payments are collected
      through this website.
    </EmptyState>
  );
}
async function Realtor({ userId }: { userId: string }) {
  const { db } = await requireUser();
  const [referrals, commissions] = await Promise.all([
    db.from("referrals").select("id,reference,status").eq("realtor_id", userId),
    db
      .from("commissions")
      .select("id,reference,amount,status")
      .eq("realtor_id", userId),
  ]);
  if (referrals.error || commissions.error)
    throw new Error("Realtor records are temporarily unavailable.");
  return (
    <div className="two-column">
      <div>
        <h2>My referrals</h2>
        {referrals.data?.length ? (
          referrals.data.map((r) => (
            <div className="record" key={r.id}>
              {r.reference} · {r.status}
            </div>
          ))
        ) : (
          <p>No referrals recorded.</p>
        )}
      </div>
      <div>
        <h2>Commission records</h2>
        {commissions.data?.length ? (
          commissions.data.map((r) => (
            <div className="record" key={r.id}>
              {r.reference} · {money(r.amount)} · {r.status}
            </div>
          ))
        ) : (
          <p>
            No commissions recorded. Only administrators can create or change
            commission records.
          </p>
        )}
      </div>
    </div>
  );
}
