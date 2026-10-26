import type { Property } from "./types";
export type PropertyFilters = Record<string, string | undefined>;
export function filterProperties(
  items: Property[],
  q: PropertyFilters,
): Property[] {
  const includes = (value: string, query?: string) =>
    !query || value.toLowerCase().includes(query.trim().toLowerCase());
  return items
    .filter(
      (p) =>
        includes(p.location, q.location) &&
        includes(p.state, q.state) &&
        includes(p.lga, q.lga) &&
        includes(p.city, q.city) &&
        includes(p.area, q.area) &&
        (!q.category || p.category === q.category) &&
        (!q.purpose || p.purpose === q.purpose) &&
        (!q.status || p.status === q.status) &&
        (!q.furnishing || p.furnishing === q.furnishing) &&
        (!q.min || (p.price !== null && p.price >= Number(q.min))) &&
        (!q.max || (p.price !== null && p.price <= Number(q.max))) &&
        (!q.bedrooms ||
          (p.bedrooms !== null && p.bedrooms >= Number(q.bedrooms))) &&
        (!q.bathrooms ||
          (p.bathrooms !== null && p.bathrooms >= Number(q.bathrooms))) &&
        (!q.feature || p.features.some((f) => includes(f, q.feature))) &&
        (!q.since ||
          (Boolean(p.listed_at) && p.listed_at.slice(0, 10) >= q.since)) &&
        (!q.q ||
          includes(
            `${p.name} ${p.reference} ${p.location} ${p.state} ${p.lga} ${p.city} ${p.area}`,
            q.q,
          )),
    )
    .sort((a, b) =>
      q.sort === "price-asc"
        ? (a.price ?? Infinity) - (b.price ?? Infinity)
        : q.sort === "price-desc"
          ? (b.price ?? -Infinity) - (a.price ?? -Infinity)
          : q.sort === "newest"
            ? b.listed_at.localeCompare(a.listed_at)
            : Number(b.featured) - Number(a.featured) ||
              b.listed_at.localeCompare(a.listed_at),
    );
}
export function pricePeriod(
  property: Pick<Property, "purpose" | "price_period">,
) {
  return property.purpose === "For rent"
    ? property.price_period === "Month"
      ? " / month"
      : " / year"
    : "";
}
