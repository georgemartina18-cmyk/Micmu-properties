import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
const base = process.env.WORKER_TEST_ORIGIN || "http://127.0.0.1:8787";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
});
const report = {
  testedAt: new Date().toISOString(),
  target: "local Cloudflare workerd; no external services configured",
  checks: [],
  network: [],
};
function check(name, passed) {
  report.checks.push({ name, passed });
  if (!passed) throw new Error(name);
}
try {
  for (const path of [
    "/",
    "/properties",
    "/about",
    "/contact",
    "/book-inspection",
    "/businesses",
    "/estates",
    "/developments",
    "/news",
    "/faq",
    "/privacy",
    "/terms",
  ]) {
    const r = await fetch(`${base}${path}`);
    const html = await r.text();
    check(
      `${path} HTTP 200 and no samples`,
      r.status === 200 && !html.includes("The Courtyard Residence"),
    );
    check(
      `${path} prelaunch noindex`,
      r.headers.get("x-robots-tag")?.includes("noindex"),
    );
  }
  const privateResponse = await fetch(`${base}/admin`, { redirect: "manual" });
  check(
    "admin redirects without a session",
    privateResponse.status === 307 &&
      privateResponse.headers.get("location")?.includes("/login"),
  );
  const unsafe = await fetch(`${base}/api/enquiries`, {
    method: "POST",
    headers: {
      origin: "https://untrusted.example",
      "content-type": "application/json",
    },
    body: "{}",
  });
  check("cross-origin write denied", unsafe.status === 403);
  const missing = await fetch(`${base}/api/enquiries`, {
    method: "POST",
    headers: { origin: base, "content-type": "application/json" },
    body: "{}",
  });
  check("unconfigured submission not acknowledged", missing.status === 503);
  for (const [name, latency, download, upload] of [
    ["Wi-Fi emulation", 10, 5000000, 2000000],
    ["4G emulation", 60, 1600000, 750000],
    ["Slow 4G emulation", 150, 200000, 90000],
    ["Constrained 3G emulation", 400, 50000, 25000],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency,
      downloadThroughput: download,
      uploadThroughput: upload,
    });
    let bytes = 0;
    cdp.on("Network.loadingFinished", (e) => {
      bytes += e.encodedDataLength;
    });
    const began = Date.now();
    await page.goto(base, { waitUntil: "networkidle" });
    check(
      `${name} content visible`,
      await page.getByRole("heading", { level: 1 }).isVisible(),
    );
    check(
      `${name} no horizontal overflow`,
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    report.network.push({
      name,
      latencyMs: latency,
      downloadBytesPerSecond: download,
      uploadBytesPerSecond: upload,
      networkIdleMs: Date.now() - began,
      encodedTransferBytes: bytes,
      note: "One local run; simulated network; not physical devices, Lighthouse or field CWV.",
    });
    await context.close();
  }
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto(base);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.evaluate(() =>
    navigator.serviceWorker.controller
      ? Promise.resolve()
      : new Promise((resolve) =>
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            resolve,
            { once: true },
          ),
        ),
  );
  await context.setOffline(true);
  await page.goto(`${base}/properties`);
  check(
    "offline fallback contains no stale prices",
    await page
      .getByRole("heading", { name: "We’ll be here when you’re back." })
      .isVisible(),
  );
  check(
    "offline fallback has no property prices",
    !(await page.content()).includes("₦145"),
  );
  await context.setOffline(false);
  await page.getByRole("link", { name: "Try again" }).click();
  check(
    "connection recovery works",
    await page.getByRole("heading", { level: 1 }).isVisible(),
  );
  await page.getByRole("button", { name: "MICMU Lite Mode" }).click();
  await page.reload();
  check(
    "production Lite Mode persists",
    (await page.locator("html").getAttribute("data-lite")) === "true",
  );
  await context.close();
  console.log(`${report.checks.length} Worker checks passed.`);
} finally {
  await browser.close();
  await mkdir("docs/validation", { recursive: true });
  await writeFile(
    process.env.WORKER_REPORT_PATH || "docs/validation/worker-results.json",
    JSON.stringify(report, null, 2) + "\n",
  );
}
