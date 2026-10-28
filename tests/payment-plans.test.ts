import { expect, it } from "vitest";
import { paymentPlan } from "../lib/payment-plans";
it("applies no surcharge for 3 months and 5/10 percent for 6/12", () => {
  expect(paymentPlan(6000000, 3).total).toBe(6000000);
  expect(paymentPlan(6000000, 6).total).toBe(6300000);
  expect(paymentPlan(6000000, 12).total).toBe(6600000);
  expect(paymentPlan(6000000, 12).payments.map((p) => p.amount)).toEqual([
    1980000, 660000, 660000, 990000, 990000, 990000, 330000,
  ]);
});
it("keeps rounded instalments equal to the exact agreed total", () => {
  for (const p of [3, 6, 12] as const) {
    const r = paymentPlan(100.01, p);
    expect(Math.round(r.payments.reduce((n, p) => n + p.amount, 0) * 100)).toBe(
      Math.round(r.total * 100),
    );
  }
});
it("rejects invalid prices", () => {
  for (const n of [-1, 0, NaN, Infinity])
    expect(() => paymentPlan(n, 3)).toThrow();
});
