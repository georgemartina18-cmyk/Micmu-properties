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
  isOwner,
  delegationReady,
}: {
  staff: StaffAccount[];
  events: StaffAccessEvent[];
  isOwner: boolean;
  delegationReady: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState<StaffAccount | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [managerConfirmed, setManagerConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  function selectAccount(value: StaffAccount | null) {
    setAccount(value);
    setConfirmed(false);
    setManagerConfirmed(false);
    setMessage("");
  }
  return (
    <div className="stack">
      <div>
        <h2>Staff access</h2>
        <p>
          The company owner and delegated staff access managers can grant or
          revoke ordinary administrator access. MFA is required. Only the owner
          can appoint or remove access managers.
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
              : account.is_access_manager
                ? "Staff access manager (protected)"
                : account.is_administrator
                  ? "Administrator"
                  : "No administrator access"}
          </p>
          {account.is_owner ? (
            <p className="notice">
              The company owner cannot be removed or demoted here.
            </p>
          ) : account.is_access_manager ? (
            <p className="notice">
              The owner must remove delegated staff access before administrator
              access can be revoked.
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
          {isOwner &&
            delegationReady &&
            !account.is_owner &&
            account.is_administrator && (
              <div>
                <h3>Delegated staff management</h3>
                <p>
                  This permission allows management of ordinary administrators.
                  It does not grant ownership or permission to appoint other
                  access managers.
                </p>
                <label className="consent">
                  <input
                    type="checkbox"
                    checked={managerConfirmed}
                    disabled={busy}
                    onChange={(event) =>
                      setManagerConfirmed(event.target.checked)
                    }
                  />
                  I confirm I want to{" "}
                  {account.is_access_manager ? "remove" : "grant"}{" "}
                  staff-access-manager permission for {account.email}.
                </label>
                <button
                  className="button"
                  disabled={busy || !managerConfirmed}
                  onClick={async () => {
                    setBusy(true);
                    setMessage("");
                    try {
                      const result = await request({
                        action: account.is_access_manager
                          ? "revoke-manager"
                          : "grant-manager",
                        user: account.user_id,
                      });
                      setAccount(null);
                      setConfirmed(false);
                      setManagerConfirmed(false);
                      setMessage(result.message);
                      router.refresh();
                    } catch (error) {
                      setMessage(
                        error instanceof Error
                          ? error.message
                          : "Delegation could not be changed.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy
                    ? "Saving…"
                    : account.is_access_manager
                      ? "Remove staff-access-manager permission"
                      : "Grant staff-access-manager permission"}
                </button>
              </div>
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
              {person.is_owner
                ? "Company owner (protected)"
                : person.is_access_manager
                  ? "Staff access manager (protected)"
                  : "Administrator"}
            </p>
            {!person.is_owner && (isOwner || !person.is_access_manager) && (
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
