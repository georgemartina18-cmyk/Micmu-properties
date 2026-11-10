import documents from "@/lib/interim-legal.json";

export function InterimLegal({ page }: { page: "privacy" | "terms" }) {
  return (
    <article className="prose">
      {documents[page].map((block, index) => {
        if (block.type === "heading") return <h2 key={index}>{block.text}</h2>;
        if (block.type === "list")
          return (
            <ul key={index}>
              {block.items?.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          );
        return (
          <p key={index} className={index === 0 ? "notice" : undefined}>
            {block.text}
          </p>
        );
      })}
    </article>
  );
}
