import type { Property } from "./types";
const samples = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "demonstration-courtyard-residence",
    reference: "DEMO-001",
    name: "The Courtyard Residence",
    location: "Lagos · demonstration location",
    category: "House",
    price: 145000000,
    size: "420 m²",
    bedrooms: 4,
    bathrooms: 4,
    status: "Available",
    description:
      "A fictional courtyard home used to demonstrate the property browsing experience. This is not a MICMU listing, offer, price, or development.",
    features: [
      "Illustrative floor plan",
      "Courtyard concept",
      "Development sample",
    ],
    image_url: null,
    published: true,
    demo: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    slug: "demonstration-garden-plots",
    reference: "DEMO-002",
    name: "The Garden Plots",
    location: "Abuja · demonstration location",
    category: "Land",
    price: 28000000,
    size: "600 m²",
    bedrooms: null,
    bathrooms: null,
    status: "Available",
    description:
      "Fictional land record for testing filters and property details. No land is being offered for sale.",
    features: ["Development sample", "No verified title"],
    image_url: null,
    published: true,
    demo: true,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    slug: "demonstration-terrace-apartment",
    reference: "DEMO-003",
    name: "The Terrace Apartment",
    location: "Lagos · demonstration location",
    category: "Apartment",
    price: 82000000,
    size: "160 m²",
    bedrooms: 2,
    bathrooms: 2,
    status: "Reserved",
    description:
      "Fictional apartment for development and interface review only. Images are architectural illustrations, not property photographs.",
    features: ["Terrace concept", "Development sample"],
    image_url: null,
    published: true,
    demo: true,
  },
];
export const demoProperties: Property[] = samples.map((p, i) => ({
  ...p,
  purpose: i === 2 ? "For rent" : "For sale",
  price_period: i === 2 ? "Year" : "Total",
  price: i === 2 ? 4800000 : p.price,
  state: i === 1 ? "Federal Capital Territory" : "Lagos",
  lga: i === 1 ? "Bwari" : "Ikeja",
  city: i === 1 ? "Abuja" : "Ikeja",
  area: i === 1 ? "Demonstration area B" : "Demonstration area A",
  furnishing: i === 2 ? "Furnished" : "Unfurnished",
  featured: i === 0,
  review_status: "Approved",
  listed_at: `2026-10-${20 + i}T12:00:00Z`,
  archived_at: null,
  gallery_urls: [],
  video_url: "",
  virtual_tour_url: "",
  latitude: null,
  longitude: null,
})) as Property[];
export function isDemo() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.MICMU_DEMO_MODE === "true"
  );
}
