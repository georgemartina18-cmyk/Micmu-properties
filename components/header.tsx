"use client";
import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X, Leaf } from "lucide-react";
const links = [
  ["About MICMU", "/about"],
  ["Properties", "/properties"],
  ["Developments", "/developments"],
  ["Partnerships", "/partnerships"],
];
export function Header() {
  const [open, setOpen] = useState(false);
  const [lite, setLite] = useState(false);
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("micmu-lite");
    } catch {
      /* Preference storage is optional. */
    }
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    const value =
      stored === null ? Boolean(connection?.saveData) : stored === "true";
    document.documentElement.dataset.lite = String(value);
    // Synchronize browser preference after hydration.
    queueMicrotask(() => setLite(value));
  }, []);
  function toggleLite() {
    const value = !lite;
    setLite(value);
    try {
      localStorage.setItem("micmu-lite", String(value));
    } catch {
      /* Preference remains active for this page. */
    }
    document.documentElement.dataset.lite = String(value);
    window.dispatchEvent(new Event("micmu-lite-change"));
  }
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="MICMU Properties home">
          <BrandLogo />
        </Link>
        <nav aria-label="Main navigation" className="desktop-nav">
          {links.map(([label, url]) => (
            <Link href={url} key={url}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="lite-toggle"
            onClick={toggleLite}
            aria-pressed={lite}
            title="MICMU Lite Mode"
            aria-label="MICMU Lite Mode"
          >
            <Leaf size={15} />
            <span>Lite {lite ? "on" : "off"}</span>
          </button>
          <Link href="/contact" className="button button-small desktop-contact">
            Let’s talk <ArrowUpRight size={15} />
          </Link>
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="menu-toggle"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-menu"
          aria-label="Mobile navigation"
          className="mobile-menu"
        >
          {[
            ["Home", "/"],
            ...links,
            ["Our businesses", "/businesses"],
            ["Contact", "/contact"],
            ["Client login", "/login"],
            ["Payment plans", "/payment-plans"],
            ["Book inspection", "/book-inspection"],
          ].map(([label, url]) => (
            <Link key={url} href={url} onClick={() => setOpen(false)}>
              {label}
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
