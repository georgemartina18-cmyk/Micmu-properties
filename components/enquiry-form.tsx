"use client";
import { useRef, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import type { Property } from "@/lib/types";
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id: string) => void;
    };
  }
}
type Kind = "contact" | "inspection" | "realtor" | "partnership" | "support";
export function EnquiryForm({
  kind,
  properties = [],
  selected = "",
  configured,
}: {
  kind: Kind;
  properties?: Property[];
  selected?: string;
  configured: boolean;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState("");
  const target = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const requestId = useRef<string | undefined>(undefined);
  const available = properties.filter(
    (p) => !p.demo && p.status === "Available",
  );
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  function renderWidget() {
    if (target.current && window.turnstile && !widget.current)
      widget.current = window.turnstile.render(target.current, {
        sitekey: siteKey,
        callback: (t: string) => setToken(t),
        "expired-callback": () => setToken(""),
        "error-callback": () => {
          setToken("");
          setStatus(
            "The security check could not load. Please retry when connected.",
          );
        },
      });
  }
  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus("");
    setSuccess(false);
    const form = e.currentTarget;
    const raw = Object.fromEntries(new FormData(form));
    if (!requestId.current) requestId.current = crypto.randomUUID();
    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...raw,
          kind,
          consent: raw.consent === "on",
          turnstile: token,
          request_id: requestId.current,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "The request could not be saved.");
      setSuccess(true);
      setStatus(data.message);
      form.reset();
      requestId.current = undefined;
    } catch (e) {
      setStatus(
        e instanceof Error
          ? e.message
          : "Connection interrupted. Please retry. Your request has not been confirmed.",
      );
    } finally {
      setBusy(false);
      setToken("");
      if (widget.current) window.turnstile?.reset(widget.current);
    }
  }
  return (
    <div className="form-panel">
      <h2>
        {kind === "inspection"
          ? "Arrange a visit."
          : kind === "realtor"
            ? "Introduce yourself."
            : kind === "support"
              ? "How can we help?"
              : "Start a conversation."}
      </h2>
      {!configured && (
        <p className="notice">
          Online submissions are not available yet. MICMU must connect its
          database and security check before this form can receive messages.
        </p>
      )}
      {kind === "inspection" && !available.length && (
        <p className="notice">
          There are no approved, available properties to inspect at the moment.
          Development samples cannot be booked.
        </p>
      )}
      <form onSubmit={submit}>
        <div className="form-grid">
          <label className="field">
            Full name
            <input name="name" autoComplete="name" required maxLength={120} />
          </label>
          <label className="field">
            Email address
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <label className="field">
            Phone number
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              required
              maxLength={24}
              placeholder="+234 …"
            />
          </label>
          <label className="field">
            WhatsApp number (optional)
            <input type="tel" name="whatsapp" maxLength={24} />
          </label>
          {kind === "contact" && (
            <label className="field span-full">
              Property of interest (optional)
              <select name="property_id" defaultValue={selected}>
                <option value="">General enquiry</option>
                {properties
                  .filter((p) => !p.demo)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.reference}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label className="field">
            Preferred contact method
            <select name="preferred_contact" defaultValue="Email">
              <option>Email</option>
              <option>Phone</option>
              <option>WhatsApp</option>
            </select>
          </label>
          {kind === "inspection" && (
            <>
              <label className="field span-full">
                Property
                <select name="property_id" required defaultValue={selected}>
                  <option value="">Select an approved property</option>
                  {available.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.reference}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Preferred date
                <input
                  name="date"
                  type="date"
                  required
                  min={new Intl.DateTimeFormat("en-CA", {
                    timeZone: "Africa/Lagos",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(new Date())}
                />
              </label>
              <label className="field">
                Preferred time (Nigeria)
                <select name="time" required defaultValue="">
                  <option value="">Choose a time</option>
                  {["09:00", "11:00", "13:00", "15:00"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Number of attendees
                <input
                  name="attendees"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={1}
                  required
                />
              </label>
            </>
          )}
          {kind === "realtor" && (
            <>
              <label className="field">
                Agency name (optional)
                <input name="agency" maxLength={160} />
              </label>
              <label className="field">
                Operating location
                <input name="location" required maxLength={160} />
              </label>
              <label className="field span-full">
                Your experience
                <textarea name="experience" maxLength={1000} required />
              </label>
            </>
          )}
          <label className="field span-full">
            {kind === "inspection"
              ? "Additional message (optional)"
              : "Your message"}
            <textarea
              name="message"
              maxLength={3000}
              required={kind !== "inspection"}
            />
          </label>
        </div>
        <label className="consent">
          <input type="checkbox" name="consent" required />
          <span>
            I have read the <Link href="/privacy">privacy notice</Link> and
            understand that these details will be used to respond to my request.
          </span>
        </label>
        {configured && siteKey && (
          <>
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
              onReady={renderWidget}
            />
            <div ref={target} style={{ marginTop: 20 }} />
          </>
        )}
        {status && (
          <p
            className={`notice ${success ? "success" : "error"}`}
            role="status"
            style={{ marginTop: 20 }}
          >
            {status}
          </p>
        )}
        <button
          className="button"
          disabled={
            busy ||
            !configured ||
            (kind === "inspection" && !available.length) ||
            !token
          }
        >
          {busy
            ? "Saving your request…"
            : kind === "inspection"
              ? "Request an inspection ↗"
              : "Send request ↗"}
        </button>
        <p className="form-note">
          {kind === "inspection"
            ? "Submitting a request does not confirm an appointment. MICMU must confirm the arrangements."
            : "Your request is acknowledged only after the server saves it."}{" "}
          No payment is collected here.
        </p>
      </form>
    </div>
  );
}
