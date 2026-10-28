const renderings = [
  {
    name: "mandela-estate",
    title: "Mandela Estate",
    description: "Estate entrance and streetscape rendering",
  },
  {
    name: "apartments",
    title: "Apartment architecture",
    description: "Apartment exterior rendering at dusk",
  },
  {
    name: "terrace-homes",
    title: "Terrace homes",
    description: "Front elevation rendering of three terrace homes",
  },
];

export function RenderingGallery() {
  return (
    <section
      className="section shell rendering-gallery"
      aria-labelledby="renderings-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">ARCHITECTURAL VISIONS</p>
          <h2 id="renderings-title">
            A closer look at <em>the possibilities.</em>
          </h2>
        </div>
      </div>
      <p className="rendering-note">
        Architectural renderings supplied by MICMU and enhanced with AI. These
        are visualisations, not photographs of completed properties. Contact
        MICMU for current project details and availability.
      </p>
      <div className="rendering-grid">
        {renderings.map((item) => (
          <figure key={item.name}>
            <a
              href={`/renderings/${item.name}-1280.webp`}
              aria-label={`View ${item.description.toLowerCase()} in full size`}
            >
              {/* Static responsive files avoid requiring a paid image transformation service. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/renderings/${item.name}-1280.webp`}
                srcSet={`/renderings/${item.name}-640.webp 640w, /renderings/${item.name}-1280.webp 1280w`}
                sizes={
                  item.name === "mandela-estate"
                    ? "(max-width: 700px) calc(100vw - 40px), 90vw"
                    : "(max-width: 700px) calc(100vw - 40px), 45vw"
                }
                width={1280}
                height={item.name === "apartments" ? 832 : 719}
                alt={item.description}
                loading="lazy"
                decoding="async"
              />
            </a>
            <figcaption>
              <h3>{item.title}</h3>
              <span>Architectural rendering · AI enhanced</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
