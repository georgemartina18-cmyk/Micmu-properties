"use client";
import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { paymentPlan, type PlanMonths } from "@/lib/payment-plans";
export function OperationForm({
  children,
  action,
  values = {},
}: {
  children: React.ReactNode;
  action: string;
  values?: Record<string, unknown>;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="form-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        const form = e.currentTarget;
        const data: Record<string, unknown> = {
          ...Object.fromEntries(new FormData(form)),
          ...values,
          action,
        };
        for (const key of [
          "years",
          "sales",
          "base",
          "plan",
          "full",
          "amount",
          "generation",
        ])
          if (key in data) data[key] = Number(data[key]);
        if (action === "sale") data.discounted = data.discounted === "on";
        if (action === "confirm")
          data.rates = [
            Number(data.rate0 || 0),
            Number(data.rate1 || 0),
            Number(data.rate2 || 0),
          ];
        try {
          const r = await fetch("/api/realtors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const b = await r.json();
          setMessage(b.message || b.error || "Could not save");
          if (r.ok) form.reset();
        } catch {
          setMessage("Connection failed. Please retry.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      <button className="button" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </button>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
function subscribeReferral(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
function storedReferral() {
  try {
    return localStorage.getItem("micmu-referral") || "";
  } catch {
    return "";
  }
}
export function RealtorApplication() {
  const search = useSearchParams();
  const [editedCode, setCode] = useState<string | null>(null);
  const savedCode = useSyncExternalStore(
    subscribeReferral,
    storedReferral,
    () => "",
  );
  const code = editedCode ?? search.get("ref") ?? savedCode;
  return (
    <OperationForm action="apply">
      <h2>Free realtor registration</h2>
      <p>
        Use your own confirmed account. MICMU reviews every application before
        granting realtor access.
      </p>
      <div className="form-grid">
        <label className="field">
          Full name
          <input name="name" required minLength={2} maxLength={180} />
        </label>
        <label className="field">
          Phone
          <input
            name="phone"
            type="tel"
            required
            minLength={7}
            maxLength={24}
          />
        </label>
        <label className="field">
          Years in real estate
          <input
            name="years"
            type="number"
            min="0"
            max="80"
            step="0.1"
            required
          />
        </label>
        <label className="field">
          Number of completed sales to date
          <input
            name="sales"
            type="number"
            min="0"
            max="1000000"
            step="1"
            required
          />
        </label>
        <label className="field">
          Referrer’s code (optional)
          <input
            name="code"
            maxLength={64}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
      </div>
      <label className="consent">
        <input type="checkbox" required />I confirm these application details
        are accurate and consent to MICMU reviewing them.
      </label>
    </OperationForm>
  );
}
export function PlanCalculator({
  basePrice = 6000000,
}: {
  basePrice?: number;
}) {
  const [base, setBase] = useState(basePrice);
  const [plan, setPlan] = useState<PlanMonths>(3);
  let result;
  try {
    result = paymentPlan(base, plan);
  } catch {}
  const money = (n: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2,
    }).format(n);
  return (
    <section className="form-panel">
      <h2>Payment plan calculator</h2>
      <p>
        Plans apply to all sale properties. Three months: no surcharge. Six
        months: add 5%. Twelve months: add 10%.
      </p>
      <div className="form-grid">
        <label className="field">
          Base property price (₦)
          <input
            type="number"
            min="1"
            max="1000000000000"
            step="0.01"
            value={base}
            onChange={(e) => setBase(Number(e.target.value))}
          />
        </label>
        <label className="field">
          Payment duration
          <select
            value={plan}
            onChange={(e) => setPlan(Number(e.target.value) as PlanMonths)}
          >
            <option value="0">Outright</option>
            <option value="3">3 months — no extra charge</option>
            <option value="6">6 months — add 5%</option>
            <option value="12">12 months — add 10%</option>
          </select>
        </label>
      </div>
      {result ? (
        <>
          <h3>Total: {money(result.total)}</h3>
          <ul>
            {result.payments.map((p, i) => (
              <li key={i}>
                {p.month === 0
                  ? "Initial payment"
                  : `By the end of month ${p.month}`}
                : {p.percentage}% — {money(p.amount)}
              </li>
            ))}
          </ul>
          <p className="form-note">
            For the 3-month and 6-month plans, the month 3 instalment is due by
            the end of the third month. Your signed payment agreement controls
            the exact due dates. This calculator does not collect payments.
          </p>
        </>
      ) : (
        <p>Enter a valid price.</p>
      )}
    </section>
  );
}
export function SaleForm({
  members,
  properties,
}: {
  members: { user_id: string; full_name: string }[];
  properties: { id: string; name: string }[];
}) {
  return (
    <OperationForm action="sale">
      <h2>Record a sale for review</h2>
      <p>
        Recording a sale does not confirm it or approve a payout. Review terms
        and calculated instalments before confirmation.
      </p>
      <div className="form-grid">
        <label className="field">
          Unique sale reference
          <input name="reference" required minLength={2} maxLength={80} />
        </label>
        <label className="field">
          Property
          <select name="property" required>
            <option value="">Select property</option>
            {properties.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Approved selling realtor
          <select name="seller" required>
            <option value="">Select realtor</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Base price (₦)
          <input
            name="base"
            type="number"
            required
            min="1"
            max="1000000000000"
            step="0.01"
          />
        </label>
        <label className="field">
          Plan
          <select name="plan">
            <option value="0">Outright</option>
            <option value="3">3 months (+0%)</option>
            <option value="6">6 months (+5%)</option>
            <option value="12">12 months (+10%)</option>
          </select>
        </label>
        <label className="field">
          Initial payment due date
          <input name="start" type="date" required />
        </label>
        <label className="field">
          Agreed discounted total (₦; ignored for standard sales)
          <input
            name="full"
            type="number"
            min="1"
            max="1000000000000"
            step="0.01"
            defaultValue="1"
            required
          />
        </label>
        <label className="consent">
          <input name="discounted" type="checkbox" />
          Discounted sale — separately agreed commission rates required
        </label>
        <label className="field span-full">
          Discounted-sale commission agreement (required for discounts)
          <textarea name="agreement" maxLength={3000} />
        </label>
      </div>
    </OperationForm>
  );
}

export function PublicRealtorRegistration() {
  const search = useSearchParams();
  const code = search.get("ref") || "";
  useEffect(() => {
    if (code) {
      try {
        localStorage.setItem("micmu-referral", code);
      } catch {}
    }
  }, [code]);
  return (
    <article className="form-panel">
      <h2>Join the MICMU realtor network</h2>
      <p>
        Registration is free. Create and confirm your account, then complete
        your realtor application. MICMU reviews your experience and previous
        sales before approval.
      </p>
      {code && (
        <p>
          Referral code: <strong>{code}</strong>
        </p>
      )}
      <p>
        <Link className="button" href="/dashboard/realtor">
          Register or open realtor portal
        </Link>
      </p>
      <p>
        After signing in, open “Realtor registration &amp; portal” in your
        dashboard. Check the referral code before submitting.
      </p>
    </article>
  );
}
