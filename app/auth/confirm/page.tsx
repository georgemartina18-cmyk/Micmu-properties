import { AuthConfirmation } from "@/components/auth-confirmation";
import { PageIntro } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Confirm your email link",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function ConfirmEmail() {
  return (
    <>
      <PageIntro
        eyebrow="ACCOUNT SECURITY"
        title="Confirm your email link."
        description="Continue securely to your MICMU account."
      />
      <section className="shell content-section">
        <AuthConfirmation />
      </section>
    </>
  );
}
