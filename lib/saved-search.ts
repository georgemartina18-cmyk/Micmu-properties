export const filterKeys = [
  "q",
  "location",
  "state",
  "lga",
  "city",
  "area",
  "category",
  "purpose",
  "status",
  "min",
  "max",
  "bedrooms",
  "bathrooms",
  "furnishing",
  "since",
  "feature",
  "sort",
] as const;
export function safeFilters(value: Record<string, unknown>) {
  return Object.fromEntries(
    filterKeys.flatMap((key) =>
      typeof value[key] === "string" &&
      String(value[key]).length <= 200 &&
      value[key] !== ""
        ? [[key, String(value[key])]]
        : [],
    ),
  );
}
