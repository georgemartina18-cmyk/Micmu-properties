import { AuthForm } from "@/components/auth-form";
import { PageIntro } from "@/components/ui";
import { databaseConfigured } from "@/lib/supabase";
export const metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export default function Login() {
  return (
    <>
      <PageIntro
        eyebrow="YOUR MICMU"
        title="A space of your own."
        description="Manage your shortlist, inspection requests and approved documents in one secure place."
      />
      <section className="shell content-section">
        <AuthForm configured={databaseConfigured()} />
      </section>
    </>
  );
}
