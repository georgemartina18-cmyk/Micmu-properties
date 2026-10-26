"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function SignOut() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  return (
    <>
      <button
        className="button button-outline"
        onClick={async () => {
          try {
            const r = await fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode: "logout" }),
            });
            const d = await r.json();
            if (r.ok) router.push("/login");
            else setMessage(d.error);
          } catch {
            setMessage("Connection interrupted. Please retry.");
          }
        }}
      >
        Sign out
      </button>
      {message && <p role="status">{message}</p>}
    </>
  );
}
export function ProfileForm({ name }: { name: string }) {
  const [message, setMessage] = useState("");
  return (
    <form
      className="form-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const r = await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              Object.fromEntries(new FormData(e.currentTarget)),
            ),
          });
          const d = await r.json();
          setMessage(d.message || d.error);
        } catch {
          setMessage("Connection interrupted. Please retry.");
        }
      }}
    >
      <label className="field">
        Full name
        <input name="full_name" defaultValue={name} required maxLength={120} />
      </label>
      <button className="button">Save profile</button>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
