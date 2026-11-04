import { publicMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { pageDefinitions } from "@/lib/pages";
import { content } from "@/lib/data";
import { PageIntro, ContactBand } from "@/components/ui";
export default async function Article({
  params,
}: {
  params: Promise<{ page: string; slug: string }>;
}) {
  const { page, slug } = await params;
  const def = pageDefinitions[page];
  if (!def?.kind) notFound();
  const item = (await content(def.kind)).find((c) => c.slug === slug);
  if (!item) notFound();
  return (
    <>
      <PageIntro
        eyebrow={def.eyebrow}
        title={item.title}
        description={item.summary}
      />
      <section className="shell content-section">
        <article className="prose">
          <p>{item.body}</p>
        </article>
      </section>
      <ContactBand />
    </>
  );
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string; slug: string }>;
}) {
  const { page, slug } = await params;
  const kind = pageDefinitions[page]?.kind;
  if (!kind) notFound();
  const item = (await content(kind)).find((c) => c.slug === slug);
  if (!item) notFound();
  return publicMetadata(
    `/${page}/${encodeURIComponent(item.slug)}`,
    item.title,
    (item.summary?.trim() || item.body).slice(0, 160),
  );
}
