"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { safeFilters } from "@/lib/saved-search";
export function SaveSearch({
  filters,
}: {
  filters: Record<string, string | undefined>;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <details className="save-search">
      <summary>Save this search</summary>
      <form
        className="actions-row"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const r = await fetch("/api/searches", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: new FormData(e.currentTarget).get("name"),
                filters: safeFilters(filters),
              }),
            });
            const d = await r.json();
            setMessage(d.message || d.error);
          } catch {
            setMessage("Connection interrupted. Please retry.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Saved search name
          <input
            name="name"
            required
            maxLength={100}
            placeholder="For example, my rental shortlist"
          />
        </label>
        <button className="button button-small" disabled={busy}>
          {busy ? "Saving…" : "Save search"}
        </button>
        {message && (
          <p role="status" className="form-note">
            {message}
          </p>
        )}
      </form>
    </details>
  );
}
export function SavedSearchList({
  items,
}: {
  items: { id: string; name: string; filters: Record<string, unknown> }[];
}) {
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div className="record-list">
      {!items.length && (
        <p>
          No saved searches yet. Choose filters in Properties and use “Save this
          search”.
        </p>
      )}
      {items.map((item) => (
        <article className="record" key={item.id}>
          <h3>{item.name}</h3>
          <div className="actions-row">
            <Link
              className="text-link"
              href={`/properties?${new URLSearchParams(safeFilters(item.filters))}`}
            >
              Run search ↗
            </Link>
            <button
              className="button button-outline button-small"
              onClick={async () => {
                try {
                  const r = await fetch("/api/searches", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: item.id }),
                  });
                  const d = await r.json();
                  setMessage(d.message || d.error);
                  if (r.ok) router.refresh();
                } catch {
                  setMessage("Connection interrupted. Please retry.");
                }
              }}
            >
              Remove search
            </button>
          </div>
        </article>
      ))}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
