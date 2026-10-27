import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { OfflineRegistration } from "@/components/offline-registration";
import { Header } from "@/components/header";
import { settings } from "@/lib/data";
import { isDemo } from "@/lib/demo";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "MICMU Properties Limited | A considered approach to property",
    template: "%s | MICMU Properties Limited",
  },
  description:
    "Explore MICMU Properties Limited. Property information, enquiries and inspection requests in one considered experience.",
  robots:
    process.env.MICMU_LAUNCH_APPROVED === "true"
      ? { index: true, follow: true }
      : { index: false, follow: false },
  openGraph: {
    title: "MICMU Properties Limited",
    description: "A considered approach to property.",
    type: "website",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101d2c",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const info = await settings();
  return (
    <html lang="en-NG" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var s=localStorage.getItem('micmu-lite');document.documentElement.dataset.lite=String(s===null?!!navigator.connection?.saveData:s==='true')}catch(e){}",
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="preview-notice">
          {isDemo()
            ? "DEVELOPMENT PREVIEW · Sample listings are fictional and not for sale or rent."
            : "PRE-LAUNCH PREVIEW · Business content and identity await MICMU approval."}
        </div>
        <Header />
        <OfflineRegistration />
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="shell">
            <div className="footer-top">
              <Link href="/" className="brand footer-brand">
                <BrandLogo dark />
              </Link>
              <p>
                A considered approach.
                <br />A lasting perspective.
              </p>
              <Link href="/contact" className="text-link">
                Start a conversation ↗
              </Link>
            </div>
            <div className="footer-columns">
              <div>
                <span className="footer-label">EXPLORE</span>
                <Link href="/properties">Properties</Link>
                <Link href="/estates">Estates</Link>
                <Link href="/developments">Developments</Link>
                <Link href="/news">News & insights</Link>
              </div>
              <div>
                <span className="footer-label">COMPANY</span>
                <Link href="/about">About MICMU</Link>
                <Link href="/businesses">Our businesses</Link>
                <Link href="/partnerships">Partnerships</Link>
                <Link href="/careers">Careers</Link>
              </div>
              <div>
                <span className="footer-label">HERE TO HELP</span>
                <Link href="/book-inspection">Book an inspection</Link>
                <Link href="/verification">Property verification</Link>
                <Link href="/representatives">Verify a representative</Link>
                <Link href="/faq">Frequently asked questions</Link>
              </div>
              <div>
                <span className="footer-label">YOUR MICMU</span>
                <Link href="/login">Client login</Link>
                <Link href="/become-a-realtor">Become a realtor</Link>
                <Link href="/contact">Contact</Link>
                {info.email && (
                  <a href={`mailto:${info.email}`}>{info.email}</a>
                )}
                {info.phone && (
                  <a href={`tel:${info.phone.replace(/[^+0-9]/g, "")}`}>
                    {info.phone}
                  </a>
                )}
                {info.facebook && (
                  <a
                    href={info.facebook}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Official Facebook ↗
                  </a>
                )}
              </div>
            </div>
            <div className="footer-bottom">
              <span>© {new Date().getFullYear()} MICMU Properties Limited</span>
              <span>Provisional brand concept · subject to approval</span>
              <div>
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
              </div>
            </div>
          </div>
        </footer>
        {info.whatsapp && (
          <a
            className="whatsapp"
            href={`https://wa.me/${info.whatsapp}?text=${encodeURIComponent("Hello MICMU Properties Limited, I would like to make an enquiry.")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp ↗
          </a>
        )}
      </body>
    </html>
  );
}
