"use client";
import { useRef, useState } from "react";
import Link from "next/link";
export function AuthForm({
  configured,
  reset = false,
  recover = false,
}: {
  configured: boolean;
  reset?: boolean;
  recover?: boolean;
}) {
  const [mode, setMode] = useState(
    reset ? "update" : recover ? "reset" : "login",
  );
  const [message, setMessage] = useState("");
  const [verifyMfa, setVerifyMfa] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  return (
    <div className="form-panel auth-panel">
      {!reset && (
        <div className="auth-tabs">
          {[
            ["login", "Sign in"],
            ["signup", "Create account"],
            ["reset", "Reset password"],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={mode === key}
              onClick={() => {
                setMode(key);
                setMessage("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <h2>
        {mode === "login"
          ? "Welcome back."
          : mode === "signup"
            ? "Your next chapter."
            : mode === "update"
              ? "Choose a new password."
              : "Let’s get you back in."}
      </h2>
      {!configured && (
        <p className="notice">
          Secure accounts are not connected yet. No login or personal data is
          stored by this preview.
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (submitting.current) return;
          submitting.current = true;
          setBusy(true);
          setMessage("");
          setVerifyMfa(false);
          const form = e.currentTarget;
          try {
            const r = await fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...Object.fromEntries(new FormData(form)),
                mode,
              }),
            });
            const d = await r.json();
            if (!r.ok) {
              setVerifyMfa(mode === "update" && d.action === "verify_mfa");
              throw new Error(d.error);
            }
            if (d.redirect) window.location.assign(d.redirect);
            else setMessage(d.message);
          } catch (e) {
            setMessage(
              e instanceof Error
                ? e.message
                : "Connection interrupted. Please retry.",
            );
          } finally {
            submitting.current = false;
            setBusy(false);
          }
        }}
      >
        {mode !== "update" && (
          <label className="field">
            Email address
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              maxLength={254}
            />
          </label>
        )}
        {mode !== "reset" && (
          <label className="field">
            Password
            <input
              type="password"
              name="password"
              minLength={12}
              maxLength={128}
              required
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
            <small>At least 12 characters.</small>
          </label>
        )}
        {mode === "signup" && (
          <label className="consent">
            <input type="checkbox" required />
            <span>
              I have read the <Link href="/privacy">privacy notice</Link> and{" "}
              <Link href="/terms">terms</Link>.
            </span>
          </label>
        )}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        {verifyMfa && (
          <p>
            <Link
              className="text-link"
              href="/dashboard/security?next=reset-password"
            >
              Verify authenticator to continue ↗
            </Link>
          </p>
        )}
        <button className="button" disabled={busy || !configured}>
          {busy
            ? "Please wait…"
            : mode === "login"
              ? "Sign in ↗"
              : mode === "signup"
                ? "Create account ↗"
                : mode === "update"
                  ? "Save password ↗"
                  : "Send reset instructions ↗"}
        </button>
      </form>
    </div>
  );
}
