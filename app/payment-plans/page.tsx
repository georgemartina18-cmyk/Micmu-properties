import { PlanCalculator } from "@/components/realtor-controls";
import { PageIntro } from "@/components/ui";
import { publicMetadata } from "@/lib/seo";
export const metadata = publicMetadata(
  "/payment-plans",
  "Property payment plans",
  "Compare outright payment and instalment calculations for MICMU sale properties. Confirm the price and available terms with MICMU before proceeding.",
);
export default function PaymentPlans() {
  return (
    <>
      <PageIntro
        eyebrow="MICMU PAYMENT OPTIONS"
        title="A plan for your next step."
        description="Compare outright payment and instalment options for MICMU sale properties."
      />
      <div className="shell content-section">
        <PlanCalculator />
      </div>
    </>
  );
}
