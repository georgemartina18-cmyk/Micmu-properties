"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function NotificationList({
  items,
}: {
  items: {
    id: string;
    title: string;
    message: string;
    href: string;
    read_at: string | null;
  }[];
}) {
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div className="record-list">
      {!items.length && <p>No notifications yet.</p>}
      {items.map((n) => (
        <article className="record" key={n.id}>
          <small>{n.read_at ? "READ" : "NEW"}</small>
          <h3>{n.title}</h3>
          <p>{n.message}</p>
          <div className="actions-row">
            <Link className="text-link" href={n.href}>
              View details ↗
            </Link>
            {!n.read_at && (
              <button
                className="button button-outline button-small"
                onClick={async () => {
                  try {
                    const r = await fetch("/api/notifications", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: n.id }),
                    });
                    const d = await r.json();
                    if (r.ok) router.refresh();
                    else setMessage(d.error);
                  } catch {
                    setMessage("Connection interrupted. Please retry.");
                  }
                }}
              >
                Mark as read
              </button>
            )}
          </div>
        </article>
      ))}
      {message && <p role="status">{message}</p>}
      <p className="form-note">
        These are dashboard notifications. Email, SMS, WhatsApp and saved-search
        alerts have not been connected.
      </p>
    </div>
  );
}
