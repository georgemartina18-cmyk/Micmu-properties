"use client";
import { useState } from "react";
import type { Property, Content, Settings } from "@/lib/types";
async function send(body: unknown) {
  const r = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "The change could not be saved.");
  return d;
}
export function PropertyEditor({ property }: { property?: Property }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="form-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const v = Object.fromEntries(new FormData(e.currentTarget));
        try {
          await send({
            action: "property",
            id: property?.id,
            data: {
              ...v,
              price: v.price === "" ? null : Number(v.price),
              bedrooms: v.bedrooms === "" ? null : Number(v.bedrooms),
              bathrooms: v.bathrooms === "" ? null : Number(v.bathrooms),
              features: String(v.features)
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
              published: v.published === "on",
              featured: v.featured === "on",
              gallery_urls: String(v.gallery_urls || "")
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
              latitude: v.latitude === "" ? null : Number(v.latitude),
              longitude: v.longitude === "" ? null : Number(v.longitude),
              image_url: v.image_url || null,
            },
          });
          setMessage(
            "Property saved. Refresh the page to see the updated list.",
          );
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "Could not save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{property ? "Edit property" : "Add a property"}</h2>
      <div className="form-grid">
        {[
          ["name", "Property name"],
          ["slug", "URL slug (lowercase-with-hyphens)"],
          ["reference", "Official property reference"],
          ["location", "Location"],
          ["size", "Size (for example, 600 m²)"],
        ].map(([key, label]) => (
          <label className="field" key={key}>
            {label}
            <input
              name={key}
              defaultValue={String(property?.[key as keyof Property] ?? "")}
              required
              maxLength={key === "location" ? 200 : 150}
            />
          </label>
        ))}
        {(
          [
            ["purpose", "Purpose", ["For sale", "For rent"]],
            ["price_period", "Price period", ["Total", "Year", "Month"]],
            [
              "furnishing",
              "Furnishing",
              ["Not specified", "Unfurnished", "Semi-furnished", "Furnished"],
            ],
            [
              "review_status",
              "Review status",
              ["Pending", "Approved", "Rejected"],
            ],
          ] as [string, string, string[]][]
        ).map(([key, label, options]) => (
          <label className="field" key={key}>
            {label}
            <select
              name={key}
              defaultValue={String(
                property?.[key as keyof Property] ?? options[0],
              )}
            >
              {options.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        ))}
        {(
          [
            ["state", "State"],
            ["lga", "Local Government Area"],
            ["city", "City / town"],
            ["area", "Area / neighbourhood"],
          ] as [string, string][]
        ).map(([key, label]) => (
          <label className="field" key={key}>
            {label}
            <input
              name={key}
              maxLength={key === "area" ? 150 : 100}
              defaultValue={String(property?.[key as keyof Property] ?? "")}
            />
          </label>
        ))}
        <label className="field">
          Category
          <select name="category" defaultValue={property?.category || "Land"}>
            <option>Land</option>
            <option>House</option>
            <option>Apartment</option>
          </select>
        </label>
        <label className="field">
          Price (₦), blank for on request
          <input
            type="number"
            name="price"
            min={0}
            defaultValue={property?.price ?? ""}
          />
        </label>
        <label className="field">
          Bedrooms (optional)
          <input
            name="bedrooms"
            type="number"
            min={0}
            max={100}
            defaultValue={property?.bedrooms ?? ""}
          />
        </label>
        <label className="field">
          Bathrooms (optional)
          <input
            name="bathrooms"
            type="number"
            min={0}
            max={100}
            defaultValue={property?.bathrooms ?? ""}
          />
        </label>
        <label className="field">
          Availability
          <select name="status" defaultValue={property?.status || "Available"}>
            <option>Available</option>
            <option>Reserved</option>
            <option>Sold</option>
            <option>Rented</option>
          </select>
        </label>
        <label className="field span-full">
          Description
          <textarea
            name="description"
            required
            maxLength={10000}
            defaultValue={property?.description}
          />
        </label>
        <label className="field span-full">
          Features (one per line)
          <textarea
            name="features"
            defaultValue={property?.features.join("\n")}
          />
        </label>
        <label className="field span-full">
          Approved image path from Media Library
          <input
            name="image_url"
            defaultValue={property?.image_url || ""}
            placeholder="/api/media/asset-id"
          />
        </label>
        <label className="field span-full">
          Additional approved image paths (one per line)
          <textarea
            name="gallery_urls"
            defaultValue={property?.gallery_urls?.join("\n")}
            placeholder="/api/media/asset-id"
          />
        </label>
        <label className="field">
          YouTube / Vimeo video link
          <input
            name="video_url"
            type="url"
            defaultValue={property?.video_url || ""}
          />
        </label>
        <label className="field">
          Virtual tour (HTTPS link)
          <input
            name="virtual_tour_url"
            type="url"
            defaultValue={property?.virtual_tour_url || ""}
          />
        </label>
        <label className="field">
          Latitude (optional)
          <input
            name="latitude"
            type="number"
            step="any"
            min={-90}
            max={90}
            defaultValue={property?.latitude ?? ""}
          />
        </label>
        <label className="field">
          Longitude (optional)
          <input
            name="longitude"
            type="number"
            step="any"
            min={-180}
            max={180}
            defaultValue={property?.longitude ?? ""}
          />
        </label>
      </div>
      <label className="consent">
        <input
          type="checkbox"
          name="featured"
          defaultChecked={property?.featured}
        />
        <span>Feature this property on the homepage.</span>
      </label>
      <label className="consent">
        <input
          type="checkbox"
          name="published"
          defaultChecked={property?.published}
        />
        <span>
          Publish this verified property. I confirm that MICMU has approved its
          details and media.
        </span>
      </label>
      <button className="button" disabled={busy}>
        {busy ? "Saving…" : "Save property"}
      </button>
      {message && (
        <p className="notice" role="status" style={{ marginTop: 20 }}>
          {message}
        </p>
      )}
    </form>
  );
}
export function ContentEditor({ item }: { item?: Content }) {
  const [message, setMessage] = useState("");
  return (
    <form
      className="form-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        const v = Object.fromEntries(new FormData(e.currentTarget));
        try {
          await send({
            action: "content",
            id: item?.id,
            data: { ...v, published: v.published === "on" },
          });
          setMessage("Content saved. Refresh to see the updated list.");
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "Save failed.");
        }
      }}
    >
      <h2>{item ? "Edit content" : "Create content"}</h2>
      <p className="form-note">
        For testimonials, use the approved customer name as Title, relationship
        as Summary and authorised quote as Body. For team profiles, use the
        approved name, role and biography. Keep all records unpublished until
        permission is confirmed.
      </p>
      <div className="form-grid">
        <label className="field">
          Content type
          <select name="kind" defaultValue={item?.kind || "article"}>
            {[
              "article",
              "estate",
              "development",
              "business",
              "faq",
              "testimonial",
              "team",
            ].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="field">
          URL slug
          <input
            name="slug"
            required
            defaultValue={item?.slug}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={160}
          />
        </label>
        <label className="field span-full">
          Title
          <input
            name="title"
            required
            defaultValue={item?.title}
            maxLength={180}
          />
        </label>
        <label className="field span-full">
          Summary
          <textarea
            name="summary"
            required
            defaultValue={item?.summary}
            maxLength={600}
          />
        </label>
        <label className="field span-full">
          Body (plain text)
          <textarea
            name="body"
            required
            defaultValue={item?.body}
            maxLength={20000}
            style={{ minHeight: 220 }}
          />
        </label>
      </div>
      <label className="consent">
        <input
          type="checkbox"
          name="published"
          defaultChecked={item?.published}
        />
        <span>
          Publish approved content. Business services must be confirmed by
          MICMU.
        </span>
      </label>
      <button className="button">Save content</button>
      {message && (
        <p className="notice" role="status" style={{ marginTop: 20 }}>
          {message}
        </p>
      )}
    </form>
  );
}
export function SettingsEditor({ value }: { value: Settings }) {
  const [message, setMessage] = useState("");
  return (
    <form
      className="form-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await send({
            action: "settings",
            data: Object.fromEntries(new FormData(e.currentTarget)),
          });
          setMessage("Company information saved.");
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "Save failed.");
        }
      }}
    >
      <h2>Approved company information</h2>
      <div className="form-grid">
        {[
          ["email", "Official email"],
          ["phone", "Official phone"],
          ["whatsapp", "WhatsApp (digits with country code)"],
          ["facebook", "Official Facebook URL"],
          ["address", "Office address"],
        ].map(([key, label]) => (
          <label className="field" key={key}>
            {label}
            <input
              name={key}
              defaultValue={value[key as keyof Settings] || ""}
            />
          </label>
        ))}
        {[
          ["about", "Company profile"],
          ["mission", "Mission"],
          ["vision", "Vision"],
          ["hero_title", "Homepage hero headline (blank for design default)"],
          ["hero_description", "Homepage hero description"],
          ["intro_title", "Homepage introduction headline"],
          ["intro_body", "Homepage introduction text"],
        ].map(([key, label]) => (
          <label className="field span-full" key={key}>
            {label}
            <textarea
              name={key}
              defaultValue={value[key as keyof Settings] || ""}
            />
          </label>
        ))}
      </div>
      <button className="button">Save approved details</button>
      {message && (
        <p className="notice" role="status" style={{ marginTop: 20 }}>
          {message}
        </p>
      )}
    </form>
  );
}
export function EnquiryActions({
  id,
  kind,
  status,
}: {
  id: string;
  kind: string;
  status: string;
}) {
  const [message, setMessage] = useState("");
  return (
    <form
      className="actions-row"
      onSubmit={async (e) => {
        e.preventDefault();
        const value = new FormData(e.currentTarget).get("status");
        try {
          await send({ action: "enquiry", id, data: { status: value } });
          setMessage("Status saved.");
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "Update failed.");
        }
      }}
    >
      <label className="field">
        Status
        <select name="status" defaultValue={status}>
          {[
            "pending",
            "confirmed",
            "completed",
            "cancelled",
            "approved",
            "rejected",
          ].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <button className="button button-small">Save status</button>
      {kind === "realtor" && (
        <button
          type="button"
          className="button button-outline"
          onClick={async () => {
            try {
              await send({ action: "approve-realtor", id });
              setMessage("Realtor approved and account role granted.");
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Approval failed.");
            }
          }}
        >
          Approve realtor account
        </button>
      )}
      {message && (
        <p className="form-note" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
export function MediaUpload() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="form-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const r = await fetch("/api/media", {
            method: "POST",
            body: new FormData(e.currentTarget),
          });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          setMessage(`Uploaded. Approved image path: ${d.url}`);
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "Upload failed.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Upload approved photography</h2>
      <div className="form-grid">
        <label className="field">
          Photograph (JPEG, PNG or WebP; max 5 MB)
          <input
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
          />
        </label>
        <label className="field">
          Source and ownership evidence
          <input
            name="source"
            required
            maxLength={500}
            placeholder="Original MICMU file / permission reference"
          />
        </label>
        <label className="field">
          Category
          <select name="category">
            {[
              "Brand assets",
              "Homepage imagery",
              "Estate photographs",
              "Property galleries",
              "Construction updates",
              "Corporate events",
              "Leadership photographs",
              "Promotional material",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Associated property reference (optional)
          <input name="property_reference" maxLength={60} />
        </label>
      </div>
      <label className="consent">
        <input type="checkbox" name="approved" required />
        <span>
          I confirm MICMU owns or has permission to publish this image.
          Uploading makes it publicly accessible.
        </span>
      </label>
      <button className="button" disabled={busy}>
        {busy ? "Uploading…" : "Upload approved image"}
      </button>
      {message && (
        <p className="notice" role="status" style={{ marginTop: 20 }}>
          {message}
        </p>
      )}
      <p className="form-note">
        R2 binding required. Videos and private documents use separate
        workflows; do not upload them here.
      </p>
    </form>
  );
}

export function ArchiveProperty({
  id,
  archived,
}: {
  id: string;
  archived: boolean;
}) {
  const [message, setMessage] = useState("");
  return (
    <>
      <button
        type="button"
        className="button button-outline"
        onClick={async () => {
          if (
            !window.confirm(
              archived
                ? "Restore this property as an unpublished draft?"
                : "Remove this property from public browsing? Its history will be retained in the archive.",
            )
          )
            return;
          try {
            await send({
              action: archived ? "restore-property" : "archive-property",
              id,
            });
            setMessage(
              archived
                ? "Restored as a draft. Refresh the list."
                : "Archived and unpublished. Refresh the list.",
            );
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Change failed.");
          }
        }}
      >
        {archived ? "Restore draft" : "Archive property"}
      </button>
      {message && <p role="status">{message}</p>}
    </>
  );
}
