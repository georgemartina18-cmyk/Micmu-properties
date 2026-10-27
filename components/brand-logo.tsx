import Image from "next/image";

export function BrandLogo({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`company-logo${dark ? " company-logo-dark" : ""}`}>
      <Image
        src={`/brand/micmu-${dark ? "black" : "white"}.jpg`}
        alt="MICMU Properties"
        width={3000}
        height={3000}
        unoptimized
        loading={dark ? "lazy" : "eager"}
      />
    </span>
  );
}
