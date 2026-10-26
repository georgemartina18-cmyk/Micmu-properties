import Link from "next/link";
import { PageIntro } from "@/components/ui";
export const dynamic = "force-static";
export const metadata = {
  title: "You’re offline",
  robots: { index: false, follow: false },
};
export default function Offline() {
  return (
    <>
      <PageIntro
        eyebrow="CONNECTION INTERRUPTED"
        title="We’ll be here when you’re back."
        description="You appear to be offline. No property prices or availability are shown because they may have changed."
      />
      <section className="shell content-section offline-copy">
        <p>
          Reconnect to view current information. Messages and inspection
          requests are never queued silently or confirmed while offline.
        </p>
        <Link className="button" href="/">
          Try again ↗
        </Link>
      </section>
    </>
  );
}
