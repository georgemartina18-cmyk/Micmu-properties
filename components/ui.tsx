import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="page-intro">
      <div className="shell">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <Search size={28} />
      <h3>{title}</h3>
      <p>{children}</p>
      <Link href="/contact" className="text-link">
        Speak with MICMU <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
export function ContactBand() {
  return (
    <section className="contact-band">
      <div className="shell contact-band-inner">
        <div>
          <p className="eyebrow">YOUR NEXT CHAPTER</p>
          <h2>
            Let’s start with
            <br />a conversation.
          </h2>
        </div>
        <div>
          <p>
            Ask a question. Explore your options.
            <br />
            Take your next step with clarity.
          </p>
          <Link href="/contact" className="button button-gold">
            Get in touch <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
