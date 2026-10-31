"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  readConfirmationLink,
  type ConfirmationLink,
} from "@/lib/auth-confirmation";

export function AuthConfirmation() {
  const pending = useRef<ConfirmationLink | null>(null);
  const submitted = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    // Capture once without consuming anything, then remove credentials and
    // provider error details from the address/history. Strict Mode may replay
    // the effect; retain the first capture rather than reading the clean URL.
    if (!pending.current)
      pending.current = readConfirmationLink(window.location.href);
    window.history.replaceState(null, "", "/auth/confirm");
  }, []);
  return (
    <div className="form-panel auth-panel">
      <h2>Continue securely.</h2>
      <p>
        To confirm your email link and continue to your account or password
        reset, press the button below.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitted.current) return;
          submitted.current = true;
          const link = pending.current;
          pending.current = null;
          if (!link || "error" in link) {
            setMessage(
              link && "error" in link && link.error === "expired"
                ? "The email provider reported an expired or already-used link. Request a new reset email and use its latest link."
                : "This confirmation link is incomplete or invalid. Please request a new email.",
            );
            return;
          }
          setBusy(true);
          try {
            const response = await fetch("/api/auth/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(link.input),
              cache: "no-store",
              redirect: "error",
            });
            const result = await response.json();
            if (!response.ok) {
              setMessage(
                result.error || "Confirmation failed. Request a new link.",
              );
              return;
            }
            if (!["/reset-password", "/dashboard"].includes(result.redirect)) {
              setMessage(
                "Confirmation could not be completed. Please request a new link.",
              );
              return;
            }
            window.location.replace(result.redirect);
          } catch {
            setMessage(
              "Confirmation was interrupted. Please request a new link before trying again.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <button className="button" disabled={busy || Boolean(message)}>
          {busy ? "Confirming…" : "Continue securely"}
        </button>
      </form>
      <p role="status" aria-live="polite">
        {message}
      </p>
      <Link href="/login?mode=reset" className="text-link">
        Request a new reset email
      </Link>
    </div>
  );
}
