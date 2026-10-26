import Link from "next/link";
import { PageIntro } from "@/components/ui";
export default function NotFound() {
  return (
    <>
      <PageIntro
        eyebrow="404 / A DIFFERENT DIRECTION"
        title="Let’s find your way."
        description="This page doesn’t exist or has not been published."
      />
      <section className="shell content-section">
        <Link href="/properties" className="button">
          Explore properties ↗
        </Link>
      </section>
    </>
  );
}
