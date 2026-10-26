import { describe, it, expect, vi } from "vitest";
import {
  submissionSchema,
  propertySchema,
  settingsSchema,
} from "../lib/validation";
import { isDemo } from "../lib/demo";
import { imageType } from "../lib/media";
const sample = {
  kind: "inspection",
  name: "Test User",
  email: "test@example.test",
  phone: "+234 800 000 0000",
  property_id: "11111111-1111-4111-8111-111111111111",
  date: "2099-12-01",
  time: "09:00",
  attendees: 2,
  consent: true,
  turnstile: "test-token",
  request_id: "22222222-2222-4222-8222-222222222222",
};
describe("Server validation", () => {
  it("accepts a complete inspection request", () => {
    expect(submissionSchema.safeParse(sample).success).toBe(true);
  });
  it.each([
    { date: "2000-01-01" },
    { date: "2099-02-30" },
    { time: "03:00" },
    { property_id: "" },
    { consent: false },
    { attendees: 0 },
    { email: "invalid" },
    { request_id: "duplicate" },
    { turnstile: "" },
  ])("rejects invalid inspection input %o", (change) => {
    expect(submissionSchema.safeParse({ ...sample, ...change }).success).toBe(
      false,
    );
  });
  it("rejects unapproved image destinations", () => {
    const p = {
      name: "Test",
      slug: "test",
      reference: "T",
      location: "Test",
      category: "Land",
      price: null,
      size: "100 m²",
      bedrooms: null,
      bathrooms: null,
      status: "Available",
      description: "Test record",
      features: [],
      image_url: "https://untrusted.example/x.svg",
      published: false,
    };
    expect(propertySchema.safeParse(p).success).toBe(false);
    expect(
      propertySchema.safeParse({
        ...p,
        image_url: "/api/media/11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(true);
  });
  it("does not accept a non-Facebook corporate link", () => {
    expect(
      settingsSchema.safeParse({
        email: "",
        phone: "",
        whatsapp: "",
        address: "",
        about: "",
        mission: "",
        vision: "",
        facebook: "https://attacker.example/facebook.com",
      }).success,
    ).toBe(false);
  });
  it("detects image bytes and rejects SVG", () => {
    expect(imageType(new TextEncoder().encode("<svg>"))).toBeNull();
    expect(imageType(new Uint8Array([255, 216, 255, 0]))).toBe("image/jpeg");
    expect(
      imageType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])),
    ).toBe("image/png");
  });
  it("never enables samples in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MICMU_DEMO_MODE", "true");
    expect(isDemo()).toBe(false);
    vi.unstubAllEnvs();
  });
});
