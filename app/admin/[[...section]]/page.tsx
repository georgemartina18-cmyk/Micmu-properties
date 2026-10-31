import Link from "next/link";
import { RealtorAdmin } from "@/components/realtor-records";
import { StaffAccess } from "@/components/staff-access";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { PageIntro, EmptyState } from "@/components/ui";
import {
  PropertyEditor,
  ArchiveProperty,
  ContentEditor,
  SettingsEditor,
  EnquiryActions,
  MediaUpload,
} from "@/components/admin-editor";
import { settings } from "@/lib/data";
import type { Property, Content } from "@/lib/types";
export const metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};
export default async function Admin({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { db } = await requireAdmin();
  const { section = [] } = await params;
  const tab = section[0] || "overview";
  if (
    section.length > 1 ||
    ![
      "overview",
      "properties",
      "content",
      "team",
      "leads",
      "media",
      "settings",
      "audit",
      "realtors",
      "sales",
      "staff",
    ].includes(tab)
  )
    notFound();
  const { data: owner, error: ownerError } = await db.rpc("is_company_owner");
  const isOwner = !ownerError && owner === true;
  if (tab === "staff" && !isOwner) redirect("/admin");
  const q = await searchParams;
  return (
    <>
      <PageIntro
        eyebrow="MICMU ADMINISTRATION"
        title="A considered control room."
        description="Manage approved content, property records and incoming requests. Important changes are logged."
      />
      <section className="shell content-section">
        <nav className="tabs" aria-label="Administration sections">
          {[
            ["overview", "Overview"],
            ["properties", "Properties"],
            ["content", "Content & services"],
            ["team", "Team members"],
            ["leads", "Enquiries & inspections"],
            ["media", "Media library"],
            ["settings", "Company settings"],
            ["audit", "Audit log"],
            ["realtors", "Realtor management"],
            ["sales", "Sales & commissions"],
          ].map(([key, label]) => (
            <Link
              key={key}
              href={`/admin/${key === "overview" ? "" : key}`}
              aria-current={key === tab ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
          {isOwner && (
            <Link
              href="/admin/staff"
              aria-current={tab === "staff" ? "page" : undefined}
            >
              Staff access
            </Link>
          )}
          <Link href="/dashboard">My account ↗</Link>
        </nav>
        {tab === "staff" ? (
          await (async () => {
            const { data, error } = await db.rpc("list_staff_access");
            if (error) throw new Error("Staff access could not be loaded.");
            const { data: events, error: eventsError } = await db
              .from("staff_access_events")
              .select("id,actor_id,target_id,action,created_at")
              .order("id", { ascending: false })
              .limit(50);
            if (eventsError)
              throw new Error("Access history could not be loaded.");
            return <StaffAccess staff={data ?? []} events={events ?? []} />;
          })()
        ) : tab === "realtors" || tab === "sales" ? (
          <RealtorAdmin db={db} tab={tab} />
        ) : tab === "overview" ? (
          <>
            <div className="admin-stat-grid">
              {await Promise.all(
                [
                  ["properties", "Properties"],
                  ["enquiries", "Requests"],
                  ["content", "Content records"],
                  ["media_assets", "Media assets"],
                ].map(async ([table, label]) => {
                  const { count, error } = await db
                    .from(table)
                    .select("id", { count: "exact", head: true });
                  if (error)
                    throw new Error(
                      "Dashboard statistics could not be loaded.",
                    );
                  return (
                    <div key={table} className="admin-stat">
                      <strong>{count}</strong>
                      <span>{label}</span>
                    </div>
                  );
                }),
              )}
            </div>
            <p className="notice">
              Publish only company-approved information. Confirm legal
              documents, contact details and media permissions before launch.
              The site remains noindex until launch is approved in deployment
              settings.
            </p>
          </>
        ) : tab === "properties" ? (
          await (async () => {
            const { data, error } = await db
              .from("properties")
              .select("*")
              .order("created_at", { ascending: false });
            if (error) throw new Error("Properties could not be loaded.");
            const selected = data?.find((p) => p.id === q.edit);
            return (
              <div className="stack">
                <PropertyEditor
                  key={selected?.id || "new"}
                  property={selected as Property | undefined}
                />
                <div className="record-list">
                  {data?.map((p) => (
                    <article className="record" key={p.id}>
                      <small>
                        {p.reference} ·{" "}
                        {p.archived_at
                          ? "ARCHIVED"
                          : p.published
                            ? "PUBLISHED"
                            : "DRAFT"}{" "}
                        · {p.review_status} · {p.purpose} · {p.status}
                      </small>
                      <h3>{p.name}</h3>
                      <div className="actions-row">
                        <ArchiveProperty
                          id={p.id}
                          archived={Boolean(p.archived_at)}
                        />
                        <Link
                          href={`/admin/properties?edit=${p.id}`}
                          className="text-link"
                        >
                          Edit ↗
                        </Link>
                        {p.published && (
                          <Link
                            href={`/properties/${p.slug}`}
                            className="text-link"
                          >
                            View published page ↗
                          </Link>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })()
        ) : tab === "content" || tab === "team" ? (
          await (async () => {
            let query = db.from("content").select("*");
            if (tab === "team") query = query.eq("kind", "team");
            const { data, error } = await query.order("created_at", {
              ascending: false,
            });
            if (error) throw new Error("Content could not be loaded.");
            return (
              <div className="stack">
                {tab === "team" && (
                  <p className="notice">
                    Team profiles are public company content. They do not create
                    accounts or grant administrator access.
                  </p>
                )}
                <ContentEditor
                  defaultKind={tab === "team" ? "team" : "article"}
                  key={q.edit || "new"}
                  item={
                    data?.find((c) => c.id === q.edit) as Content | undefined
                  }
                />
                {data?.map((c) => (
                  <article className="record" key={c.id}>
                    <small>
                      {c.kind} · {c.published ? "PUBLISHED" : "DRAFT"}
                    </small>
                    <h3>{c.title}</h3>
                    <Link
                      className="text-link"
                      href={`/admin/${tab}?edit=${c.id}`}
                    >
                      Edit content ↗
                    </Link>
                  </article>
                ))}
              </div>
            );
          })()
        ) : tab === "settings" ? (
          <SettingsEditor value={await settings()} />
        ) : tab === "leads" ? (
          await (async () => {
            const { data, error } = await db
              .from("enquiries")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(100);
            if (error) throw new Error("Requests could not be loaded.");
            return data?.length ? (
              <div className="record-list">
                {data.map((r) => (
                  <article key={r.id} className="record">
                    <small>
                      {r.kind.toUpperCase()} ·{" "}
                      {new Date(r.created_at).toLocaleString("en-NG", {
                        timeZone: "Africa/Lagos",
                      })}{" "}
                      (Nigeria)
                    </small>
                    <h3>
                      {r.payload.name} · {r.status}
                    </h3>
                    <p>
                      {r.payload.email} · {r.payload.phone} · Preferred contact:{" "}
                      {r.payload.preferred_contact || "Email"}
                    </p>
                    {r.payload.date && (
                      <p>
                        Preferred visit: {r.payload.date} at {r.payload.time} ·{" "}
                        {r.payload.attendees} attendees
                        <br />
                        Property: {r.payload.property_id}
                      </p>
                    )}
                    <p>{r.payload.message}</p>
                    {r.kind === "realtor" && (
                      <p>
                        {r.payload.agency} · {r.payload.location}
                        <br />
                        {r.payload.experience}
                      </p>
                    )}
                    <small>Reference: {r.id}</small>
                    <EnquiryActions id={r.id} kind={r.kind} status={r.status} />
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No requests yet">
                New enquiries, inspections and realtor applications will appear
                here.
              </EmptyState>
            );
          })()
        ) : tab === "media" ? (
          await (async () => {
            const { data, error } = await db
              .from("media_assets")
              .select("*")
              .order("created_at", { ascending: false });
            if (error) throw new Error("Media could not be loaded.");
            return (
              <div className="stack">
                <MediaUpload />
                {data?.map((m) => (
                  <article className="record" key={m.id}>
                    <small>
                      {m.category} · {m.approved ? "APPROVED" : "PENDING"}
                    </small>
                    <h3>{m.filename}</h3>
                    <p>
                      Source: {m.source}
                      <br />
                      Property: {m.property_reference || "Unassigned"}
                    </p>
                    <code>/api/media/{m.id}</code>
                  </article>
                ))}
              </div>
            );
          })()
        ) : (
          await (async () => {
            const { data, error } = await db
              .from("audit_logs")
              .select("id,action,table_name,record_id,actor_id,created_at")
              .order("created_at", { ascending: false })
              .limit(100);
            if (error) throw new Error("Audit log could not be loaded.");
            return (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>When (Nigeria)</th>
                      <th>Action</th>
                      <th>Table</th>
                      <th>Record</th>
                      <th>Actor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.map((r) => (
                      <tr key={r.id}>
                        <td>
                          {new Date(r.created_at).toLocaleString("en-NG", {
                            timeZone: "Africa/Lagos",
                          })}
                        </td>
                        <td>{r.action}</td>
                        <td>{r.table_name}</td>
                        <td>{r.record_id}</td>
                        <td>{r.actor_id || "System"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()
        )}
      </section>
    </>
  );
}
