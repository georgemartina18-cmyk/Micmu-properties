import Image from "next/image";

export function BrandLogo({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`company-logo${dark ? " company-logo-dark" : ""}`}>
      <Image
        src="/brand/micmu-transparent.png"
        alt="MICMU Properties"
        width={680}
        height={488}
        unoptimized
        loading={dark ? "lazy" : "eager"}
      />
    </span>
  );
}
