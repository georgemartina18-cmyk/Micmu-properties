"use client";
import { useState } from "react";
import type { Property } from "@/lib/types";
import type { PropertyFilters } from "@/lib/property-search";
export function PropertyFilterForm({
  items,
  q,
}: {
  items: Pick<Property, "state" | "lga" | "city" | "area" | "location">[];
  q: PropertyFilters;
}) {
  const [state, setState] = useState(q.state || "");
  const [lga, setLga] = useState(q.lga || "");
  const [city, setCity] = useState(q.city || "");
  const [area, setArea] = useState(q.area || "");
  const values = (key: "state" | "lga" | "city" | "area") =>
    [
      ...new Set(
        items
          .filter(
            (p) =>
              (key === "state" || !state || p.state === state) &&
              (["state", "lga"].includes(key) || !lga || p.lga === lga) &&
              (key !== "area" || !city || p.city === city),
          )
          .map((p) => p[key])
          .filter(Boolean),
      ),
    ].sort();
  function select(
    key: "state" | "lga" | "city" | "area",
    label: string,
    value: string,
    set: (s: string) => void,
  ) {
    const options = values(key);
    return (
      <label className="field">
        {label}
        <select name={key} value={value} onChange={(e) => set(e.target.value)}>
          <option value="">All {label.toLowerCase()}s</option>
          {value && !options.includes(value) && (
            <option value={value}>{value}</option>
          )}
          {options.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <form className="filter-form">
      <label className="field">
        Search
        <input
          name="q"
          defaultValue={q.q}
          placeholder="Name or official reference"
          maxLength={160}
        />
      </label>
      <label className="field">
        Purpose
        <select name="purpose" defaultValue={q.purpose || ""}>
          <option value="">Sale & rent</option>
          <option>For sale</option>
          <option>For rent</option>
        </select>
      </label>
      <label className="field">
        Property type
        <select name="category" defaultValue={q.category || ""}>
          <option value="">All types</option>
          <option>Land</option>
          <option>House</option>
          <option>Apartment</option>
        </select>
      </label>
      <label className="field">
        Availability
        <select name="status" defaultValue={q.status || ""}>
          <option value="">All statuses</option>
          <option>Available</option>
          <option>Reserved</option>
          <option>Sold</option>
          <option>Rented</option>
        </select>
      </label>
      {select("state", "State", state, (v) => {
        setState(v);
        setLga("");
        setCity("");
        setArea("");
      })}
      {select("lga", "LGA", lga, (v) => {
        setLga(v);
        setCity("");
        setArea("");
      })}
      {select("city", "City / town", city, (v) => {
        setCity(v);
        setArea("");
      })}
      {select("area", "Area", area, setArea)}
      <label className="field">
        Minimum budget (₦)
        <input
          name="min"
          type="number"
          min={0}
          defaultValue={q.min}
          placeholder="No minimum"
        />
      </label>
      <label className="field">
        Maximum budget (₦)
        <input
          name="max"
          type="number"
          min={0}
          defaultValue={q.max}
          placeholder="No maximum"
        />
      </label>
      <label className="field">
        Bedrooms
        <select name="bedrooms" defaultValue={q.bedrooms || ""}>
          <option value="">Any</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}+
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Sort by
        <select name="sort" defaultValue={q.sort || ""}>
          <option value="">Featured first</option>
          <option value="newest">Newest listed</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </label>
      <details
        className="span-full advanced-filters"
        open={Boolean(
          q.bathrooms || q.furnishing || q.since || q.feature || q.location,
        )}
      >
        <summary>More filters</summary>
        <div className="form-grid">
          <label className="field">
            Bathrooms
            <select name="bathrooms" defaultValue={q.bathrooms || ""}>
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Furnishing
            <select name="furnishing" defaultValue={q.furnishing || ""}>
              <option value="">Any</option>
              <option>Furnished</option>
              <option>Semi-furnished</option>
              <option>Unfurnished</option>
              <option>Not specified</option>
            </select>
          </label>
          <label className="field">
            Listed on or after
            <input type="date" name="since" defaultValue={q.since} />
          </label>
          <label className="field">
            Property feature
            <input
              name="feature"
              defaultValue={q.feature}
              maxLength={100}
              placeholder="For example, courtyard"
            />
          </label>
          <label className="field">
            Location text
            <input name="location" defaultValue={q.location} maxLength={200} />
          </label>
        </div>
      </details>
      <p className="form-note span-full">
        Rent prices are shown with their monthly or yearly period. Location
        choices come only from published records; they are not a complete
        Nigerian address register.
      </p>
      <button className="button">Apply filters ↗</button>
    </form>
  );
}
