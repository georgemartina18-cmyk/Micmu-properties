import { PlanCalculator } from "@/components/realtor-controls";
import { PageIntro } from "@/components/ui";
export const metadata = { title: "Payment plans" };
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
