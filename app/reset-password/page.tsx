import { AuthForm } from "@/components/auth-form";
import { PageIntro } from "@/components/ui";
import { requireUser } from "@/lib/auth";
export const metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};
export default async function ResetPassword() {
  await requireUser();
  return (
    <>
      <PageIntro
        eyebrow="ACCOUNT SECURITY"
        title="A fresh start."
        description="Choose a new password for your account."
      />
      <section className="shell content-section">
        <AuthForm configured reset />
      </section>
    </>
  );
}
