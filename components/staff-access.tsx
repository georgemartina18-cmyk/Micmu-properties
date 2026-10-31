"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StaffAccount, StaffAccessEvent } from "@/lib/staff-access";

async function request(body: unknown) {
  const response = await fetch("/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Staff access could not be updated.");
  return data;
}

export function StaffAccess({
  staff,
  events,
}: {
  staff: StaffAccount[];
  events: StaffAccessEvent[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState<StaffAccount | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  function selectAccount(value: StaffAccount | null) {
    setAccount(value);
    setConfirmed(false);
    setMessage("");
  }
  return (
    <div className="stack">
      <div>
        <h2>Staff access</h2>
        <p>
          Only the company owner can grant or revoke administrator access. Staff
          must verify MFA before using administration.
        </p>
        <p className="muted">
          Public Team members profiles do not grant account access. Revoking
          administrator access keeps the account and any realtor or client
          roles.
        </p>
      </div>
      <form
        className="form-panel"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          selectAccount(null);
          try {
            const data = await request({
              action: "lookup",
              email: email.trim(),
            });
            setAccount(data.account);
          } catch (error) {
            setMessage(
              error instanceof Error ? error.message : "Account lookup failed.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>Find an existing confirmed account</h3>
        <label className="field">
          Login email
          <input
            type="email"
            required
            maxLength={254}
            autoComplete="off"
            value={email}
            disabled={busy}
            onChange={(event) => {
              setEmail(event.target.value);
              selectAccount(null);
            }}
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? "Working…" : "Find account"}
        </button>
      </form>
      {account && (
        <div className="form-panel">
          <h3>{account.full_name || account.email}</h3>
          <p>
            {account.email}
            <br />
            Account ID: {account.user_id}
            <br />
            Current access:{" "}
            {account.is_owner
              ? "Company owner (protected)"
              : account.is_administrator
                ? "Administrator"
                : "No administrator access"}
          </p>
          {account.is_owner ? (
            <p className="notice">
              The company owner cannot be removed or demoted here.
            </p>
          ) : (
            <>
              <label className="consent">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={busy}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                I confirm I want to{" "}
                {account.is_administrator ? "revoke" : "grant"} administrator
                access for {account.email}.
              </label>
              <button
                className="button"
                disabled={busy || !confirmed}
                onClick={async () => {
                  setBusy(true);
                  setMessage("");
                  try {
                    const result = await request({
                      action: account.is_administrator ? "revoke" : "grant",
                      user: account.user_id,
                    });
                    setMessage(result.message);
                    setAccount(null);
                    setConfirmed(false);
                    router.refresh();
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : "Access could not be changed.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy
                  ? "Saving…"
                  : account.is_administrator
                    ? "Revoke administrator access"
                    : "Grant administrator access"}
              </button>
            </>
          )}
        </div>
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
      <div className="record-list">
        <h3>Current administrators</h3>
        {staff.map((person) => (
          <article className="record" key={person.user_id}>
            <h3>{person.full_name || person.email}</h3>
            <p>
              {person.email} ·{" "}
              {person.is_owner ? "Company owner (protected)" : "Administrator"}
            </p>
            {!person.is_owner && (
              <button
                className="button button-outline"
                disabled={busy}
                onClick={() => selectAccount(person)}
              >
                Review access
              </button>
            )}
          </article>
        ))}
      </div>
      <div className="table-wrap">
        <h3>Recent access changes</h3>
        <table>
          <thead>
            <tr>
              <th>When (Nigeria)</th>
              <th>Action</th>
              <th>Account</th>
              <th>Changed by</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>
                  {new Date(event.created_at).toLocaleString("en-NG", {
                    timeZone: "Africa/Lagos",
                  })}
                </td>
                <td>{event.action.replaceAll("_", " ")}</td>
                <td>{event.target_id}</td>
                <td>{event.actor_id || "Database setup"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && <p>No access changes recorded yet.</p>}
      </div>
    </div>
  );
}
