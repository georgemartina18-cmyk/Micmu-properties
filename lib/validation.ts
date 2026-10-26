import { filterKeys } from "./saved-search";
import { z } from "zod";
const text = (max: number) =>
  z.string().trim().min(1, "This field is required.").max(max);
export const submissionSchema = z
  .object({
    kind: z.enum([
      "contact",
      "inspection",
      "realtor",
      "partnership",
      "support",
    ]),
    name: text(120),
    email: z.email().max(254),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{7,24}$/, "Enter a valid phone number."),
    whatsapp: z.string().trim().max(24).optional().default(""),
    preferred_contact: z.enum(["Email", "Phone", "WhatsApp"]).default("Email"),
    message: z.string().trim().max(3000).default(""),
    property_id: z
      .union([z.uuid(), z.literal("")])
      .optional()
      .default(""),
    date: z.string().optional().default(""),
    time: z.string().optional().default(""),
    attendees: z.coerce.number().int().min(1).max(20).default(1),
    agency: z.string().trim().max(160).default(""),
    location: z.string().trim().max(160).default(""),
    experience: z.string().trim().max(1000).default(""),
    consent: z.literal(true, {
      error: "Please acknowledge the privacy notice.",
    }),
    turnstile: z.string().min(1).max(2048),
    request_id: z.uuid(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "inspection") {
      if (!data.property_id)
        ctx.addIssue({
          code: "custom",
          path: ["property_id"],
          message: "Choose an available property.",
        });
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Lagos",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const parsed = new Date(`${data.date}T12:00:00Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
        Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== data.date ||
        data.date < today
      )
        ctx.addIssue({
          code: "custom",
          path: ["date"],
          message: "Choose a valid future date.",
        });
      if (!["09:00", "11:00", "13:00", "15:00"].includes(data.time))
        ctx.addIssue({
          code: "custom",
          path: ["time"],
          message: "Choose an available time.",
        });
    }
  });
export const propertySchema = z
  .object({
    name: text(150),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(160),
    reference: text(60),
    location: text(200),
    category: z.enum(["Land", "House", "Apartment"]),
    price: z.number().nonnegative().nullable(),
    size: text(80),
    bedrooms: z.number().int().min(0).max(100).nullable(),
    bathrooms: z.number().int().min(0).max(100).nullable(),
    status: z.enum(["Available", "Reserved", "Sold", "Rented"]),
    purpose: z.enum(["For sale", "For rent"]).default("For sale"),
    price_period: z.enum(["Total", "Year", "Month"]).default("Total"),
    state: z.string().trim().max(100).default(""),
    lga: z.string().trim().max(100).default(""),
    city: z.string().trim().max(100).default(""),
    area: z.string().trim().max(150).default(""),
    furnishing: z
      .enum(["Not specified", "Unfurnished", "Semi-furnished", "Furnished"])
      .default("Not specified"),
    featured: z.boolean().default(false),
    review_status: z
      .enum(["Pending", "Approved", "Rejected"])
      .default("Pending"),
    gallery_urls: z
      .array(z.string().regex(/^\/api\/media\/[0-9a-f-]{36}$/))
      .max(20)
      .default([]),
    video_url: z
      .union([
        z
          .url()
          .max(1000)
          .refine((v) => {
            const u = URL.canParse(v) ? new URL(v) : null;
            return (
              u !== null &&
              u.protocol === "https:" &&
              [
                "youtube.com",
                "www.youtube.com",
                "youtu.be",
                "vimeo.com",
                "www.vimeo.com",
              ].includes(u.hostname)
            );
          }, "Use an approved YouTube or Vimeo HTTPS link."),
        z.literal(""),
      ])
      .default(""),
    virtual_tour_url: z
      .union([
        z
          .url()
          .max(1000)
          .refine((v) => {
            const u = URL.canParse(v) ? new URL(v) : null;
            return (
              u !== null &&
              u.protocol === "https:" &&
              !u.username &&
              !u.password
            );
          }, "Use a public HTTPS tour link."),
        z.literal(""),
      ])
      .default(""),
    latitude: z.number().min(-90).max(90).nullable().default(null),
    longitude: z.number().min(-180).max(180).nullable().default(null),
    description: text(10000),
    features: z.array(text(100)).max(30),
    image_url: z
      .union([z.string().regex(/^\/api\/media\/[0-9a-f-]{36}$/), z.literal("")])
      .nullable(),
    published: z.boolean(),
  })
  .superRefine((p, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (p.published && p.review_status !== "Approved")
      issue("review_status", "Approve the property before publishing.");
    if (p.purpose === "For rent" && p.price_period === "Total")
      issue("price_period", "Choose a monthly or yearly rental period.");
    if (p.purpose === "For sale" && p.price_period !== "Total")
      issue("price_period", "Sale prices must use the total price.");
    if (
      (p.status === "Rented" && p.purpose !== "For rent") ||
      (p.status === "Sold" && p.purpose !== "For sale")
    )
      issue("status", "The status must match the property purpose.");
    if ((p.latitude === null) !== (p.longitude === null))
      issue("latitude", "Provide both map coordinates or leave both blank.");
  });
export const contentSchema = z.object({
  kind: z.enum([
    "article",
    "estate",
    "development",
    "business",
    "faq",
    "testimonial",
    "team",
  ]),
  title: text(180),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(160),
  summary: text(600),
  body: text(20000),
  published: z.boolean(),
});
export const settingsSchema = z.object({
  email: z.union([z.email(), z.literal("")]),
  phone: z
    .string()
    .max(24)
    .regex(/^[+0-9 ()-]*$/),
  whatsapp: z.string().regex(/^[0-9]{7,15}$|^$/),
  address: z.string().max(500),
  facebook: z.union([
    z
      .url()
      .refine(
        (v) =>
          URL.canParse(v) &&
          (new URL(v).hostname === "www.facebook.com" ||
            new URL(v).hostname === "facebook.com"),
      ),
    z.literal(""),
  ]),
  about: z.string().max(10000),
  mission: z.string().max(3000),
  vision: z.string().max(3000),
  hero_title: z.string().trim().max(150).default(""),
  hero_description: z.string().trim().max(500).default(""),
  intro_title: z.string().trim().max(150).default(""),
  intro_body: z.string().trim().max(1500).default(""),
});

export const searchSchema = z.object({
  name: z.string().trim().min(1).max(100),
  filters: z
    .record(z.string(), z.string().max(200))
    .refine((v) =>
      Object.keys(v).every((k) =>
        (filterKeys as readonly string[]).includes(k),
      ),
    ),
});
