"use client";
import Link from "next/link";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="shell content-section">
      <p className="eyebrow">TEMPORARILY UNAVAILABLE</p>
      <h1>A moment to reconnect.</h1>
      <p>
        We couldn’t load this information. Your request has not been confirmed
        by this error page.
      </p>
      <div className="actions-row">
        <button className="button" onClick={reset}>
          Try again
        </button>
        <Link className="text-link" href="/">
          Return home ↗
        </Link>
      </div>
    </section>
  );
}
