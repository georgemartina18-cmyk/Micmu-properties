"use client";
import { useState } from "react";
export function VerificationForm({
  type,
}: {
  type: "property" | "representative";
}) {
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="form-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setResult("");
        const ref = String(
          new FormData(e.currentTarget).get("reference") || "",
        );
        try {
          const r = await fetch(
            `/api/verify?type=${type}&reference=${encodeURIComponent(ref)}`,
          );
          const d = await r.json();
          setResult(d.error || d.message);
        } catch {
          setResult(
            "Verification could not be completed. Please retry when connected.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="field">
        Official reference number
        <input
          name="reference"
          required
          minLength={3}
          maxLength={60}
          placeholder="Enter the reference exactly as issued"
        />
      </label>
      <button className="button" disabled={busy}>
        {busy ? "Checking…" : "Check reference ↗"}
      </button>
      {result && (
        <p className="notice" role="status" style={{ marginTop: 20 }}>
          {result}
        </p>
      )}
      <p className="form-note">
        Only approved public information is returned. A missing record does not
        prove fraud. Contact MICMU for clarification.
      </p>
    </form>
  );
}
