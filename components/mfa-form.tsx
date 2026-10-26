"use client";
import { useState } from "react";
import Link from "next/link";
export function MfaForm({ factorId }: { factorId?: string }) {
  const [factor, setFactor] = useState(factorId || "");
  const [qr, setQr] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function call(body: unknown) {
    const r = await fetch("/api/mfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    return d;
  }
  return (
    <div className="form-panel auth-panel">
      <h2>Protect your account.</h2>
      <p className="form-note">
        Administrator access requires a second factor. Use an authenticator app.
        Keep recovery access to your email and contact the authorised database
        owner if you lose the device.
      </p>
      {!factor && (
        <button
          disabled={busy}
          className="button"
          onClick={async () => {
            setBusy(true);
            try {
              const d = await call({ mode: "enroll" });
              setFactor(d.id);
              setQr(d.qr);
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Setup failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Set up an authenticator
        </button>
      )}
      {qr && (
        <>
          <p className="form-note">
            Scan this QR code in your authenticator, then enter its current
            six-digit code. Do not share this code or QR image.
          </p>
          {/* A data image confines provider-generated SVG to an image context. */}
          <span
            className="mfa-qr"
            role="img"
            aria-label="Authenticator enrollment QR code"
            style={{
              display: "block",
              width: 220,
              height: 220,
              background: `white url(${JSON.stringify(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.replace(/^data:image\/svg\+xml;utf-8,/, ""))}`)}) center/contain no-repeat`,
            }}
          />
        </>
      )}
      {factor && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const d = await call({
                mode: "verify",
                factor_id: factor,
                code: new FormData(e.currentTarget).get("code"),
              });
              setMessage(d.message);
              setQr("");
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : "Verification failed.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            Authenticator code
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
            />
          </label>
          <button className="button" disabled={busy}>
            {busy ? "Verifying…" : "Verify authenticator"}
          </button>
        </form>
      )}
      {message && (
        <p className="notice" role="status" style={{ marginTop: 20 }}>
          {message}
        </p>
      )}
      <div className="actions-row">
        <Link href="/admin" className="text-link">
          Continue to administration ↗
        </Link>
      </div>
    </div>
  );
}
