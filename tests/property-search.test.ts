import { describe, it, expect } from "vitest";
import { demoProperties } from "../lib/demo";
import { filterProperties, pricePeriod } from "../lib/property-search";
import { propertySchema, searchSchema } from "../lib/validation";
import { safeFilters } from "../lib/saved-search";
describe("Client brief marketplace requirements", () => {
  it("separates sale and rental listings", () => {
    expect(
      filterProperties(demoProperties, { purpose: "For rent" }).map(
        (p) => p.reference,
      ),
    ).toEqual(["DEMO-003"]);
    expect(
      filterProperties(demoProperties, { purpose: "For sale" }),
    ).toHaveLength(2);
  });
  it("combines Nigerian hierarchy, bathrooms and furnishing filters", () => {
    expect(
      filterProperties(demoProperties, {
        state: "Lagos",
        lga: "Ikeja",
        city: "Ikeja",
        area: "area A",
        bathrooms: "2",
        furnishing: "Furnished",
      }).map((p) => p.reference),
    ).toEqual(["DEMO-003"]);
    expect(
      filterProperties(demoProperties, {
        state: "Federal Capital Territory",
        lga: "Ikeja",
      }),
    ).toHaveLength(0);
  });
  it("filters by listed date and feature without inventing matches", () => {
    expect(
      filterProperties(demoProperties, { since: "2026-10-22" }),
    ).toHaveLength(1);
    expect(
      filterProperties(demoProperties, { feature: "courtyard" }).map(
        (p) => p.reference,
      ),
    ).toEqual(["DEMO-001"]);
  });
  it("sorts featured properties and budget explicitly", () => {
    expect(filterProperties(demoProperties, {})[0].featured).toBe(true);
    expect(
      filterProperties(demoProperties, { sort: "price-asc" })[0].reference,
    ).toBe("DEMO-003");
  });
  it("labels rental prices with their period", () => {
    expect(pricePeriod(demoProperties[0])).toBe("");
    expect(pricePeriod(demoProperties[2])).toBe(" / year");
  });
  it("rejects unapproved publishing and inconsistent rental data", () => {
    expect(
      propertySchema.safeParse({
        ...demoProperties[0],
        published: true,
        review_status: "Pending",
      }).success,
    ).toBe(false);
    expect(
      propertySchema.safeParse({ ...demoProperties[2], price_period: "Total" })
        .success,
    ).toBe(false);
    expect(
      propertySchema.safeParse({ ...demoProperties[2], status: "Sold" })
        .success,
    ).toBe(false);
  });
  it("rejects unsupported video URLs and incomplete map coordinates", () => {
    expect(
      propertySchema.safeParse({
        ...demoProperties[0],
        video_url: "https://attacker.example/video",
      }).success,
    ).toBe(false);
    expect(
      propertySchema.safeParse({
        ...demoProperties[0],
        latitude: 6.5,
        longitude: null,
      }).success,
    ).toBe(false);
    expect(
      propertySchema.safeParse({
        ...demoProperties[0],
        video_url: "https://www.youtube.com/watch?v=example",
      }).success,
    ).toBe(true);
  });
  it("keeps saved searches on the property route and strips unknown keys", () => {
    expect(
      safeFilters({
        purpose: "For rent",
        redirect: "https://attacker.example",
        state: 42,
      }),
    ).toEqual({ purpose: "For rent" });
    expect(
      searchSchema.safeParse({
        name: "Search",
        filters: { redirect: "https://attacker.example" },
      }).success,
    ).toBe(false);
  });
});
