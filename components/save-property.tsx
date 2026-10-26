"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function SaveProperty({
  id,
  remove = false,
}: {
  id: string;
  remove?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className="button button-outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const response = await fetch("/api/saved", {
              method: remove ? "DELETE" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ property_id: id }),
            });
            const result = await response.json();
            setMessage(result.message || result.error);
            if (response.ok && remove) router.refresh();
          } catch {
            setMessage("Connection interrupted. Please retry.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? "Updating…"
          : remove
            ? "Remove from shortlist"
            : "Save to my shortlist ♡"}
      </button>
      {message && <p role="status">{message}</p>}
    </>
  );
}
