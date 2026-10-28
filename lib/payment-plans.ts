export type PlanMonths = 0 | 3 | 6 | 12;
export const planTerms = {
  0: { surcharge: 0, percentages: [100], months: [0] },
  3: { surcharge: 0, percentages: [50, 30, 20], months: [0, 2, 3] },
  6: { surcharge: 5, percentages: [40, 20, 20, 20], months: [0, 2, 3, 6] },
  12: {
    surcharge: 10,
    percentages: [30, 10, 10, 15, 15, 15, 5],
    months: [0, 2, 4, 6, 8, 10, 12],
  },
};
export function paymentPlan(base: number, months: PlanMonths) {
  if (
    !Number.isFinite(base) ||
    base <= 0 ||
    base > 1e12 ||
    !Object.hasOwn(planTerms, months)
  )
    throw new Error("Invalid payment plan");
  const terms = planTerms[months];
  const total = Math.round(base * (100 + terms.surcharge)) / 100;
  let allocated = 0;
  const payments = terms.percentages.map((percentage, i) => {
    const amount =
      i === terms.percentages.length - 1
        ? Math.round((total - allocated) * 100) / 100
        : Math.round(total * percentage) / 100;
    allocated += amount;
    return { month: terms.months[i], percentage, amount };
  });
  return { total, payments };
}
