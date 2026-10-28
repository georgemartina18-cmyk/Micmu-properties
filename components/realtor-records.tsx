import type { SupabaseClient } from "@supabase/supabase-js";
import { Suspense } from "react";
import {
  OperationForm,
  RealtorApplication,
  SaleForm,
} from "./realtor-controls";
const money = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(
    n,
  );
export async function RealtorRecords({
  db,
  userId,
}: {
  db: SupabaseClient;
  userId: string;
}) {
  const { data: me, error } = await db
    .from("realtor_members")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error)
    return (
      <p className="notice">
        Realtor registration setup is pending. Please contact MICMU.
      </p>
    );
  if (!me)
    return (
      <Suspense>
        <RealtorApplication />
      </Suspense>
    );
  const [{ data: downlines }, { data: sales }, { data: commissions }] =
    await Promise.all([
      db.rpc("my_direct_downlines"),
      db
        .from("realtor_sales")
        .select("id,reference,full_price,status,plan_months")
        .eq("seller_id", userId),
      db
        .from("sale_commissions")
        .select("sale_id,sale_reference,generation,rate,amount,status")
        .eq("realtor_id", userId),
    ]);
  return (
    <div className="stack">
      <article className="record">
        <h2>{me.full_name}</h2>
        <p>Application: {me.status}. Registration is free.</p>
        {me.status === "approved" && (
          <>
            <p>
              Your referral code: <strong>{me.referral_code}</strong>
            </p>
            <p>Share this registration link:</p>
            <code className="referral-link">
              {process.env.NEXT_PUBLIC_SITE_URL ||
                "https://micmu-properties.georgemartina18.workers.dev"}
              /become-a-realtor?ref={me.referral_code}
            </code>
          </>
        )}
      </article>
      {me.status === "approved" && (
        <article className="record">
          <h2>People you personally referred</h2>
          {downlines?.length ? (
            downlines.map(
              (d: { user_id: string; full_name: string; status: string }) => (
                <p key={d.user_id}>
                  {d.full_name} · {d.status}
                </p>
              ),
            )
          ) : (
            <p>No direct referrals yet.</p>
          )}
        </article>
      )}
      <article className="record">
        <h2>Your sales</h2>
        {sales?.length ? (
          sales.map((s) => (
            <p key={s.id}>
              {s.reference} · {money(s.full_price)} ·{" "}
              {s.plan_months || "Outright"} · {s.status}
            </p>
          ))
        ) : (
          <p>No sales recorded.</p>
        )}
      </article>
      <article className="record">
        <h2>Your commissions</h2>
        <p>
          Calculated on full sale price including plan charges. Amounts remain
          subject to administrator approval; this page does not promise a payout
          date.
        </p>
        {commissions?.length ? (
          commissions.map((c) => (
            <p key={`${c.sale_id}-${c.generation}`}>
              {c.generation === 0
                ? "Personal sale"
                : `Referral generation ${c.generation}`}{" "}
              · {c.sale_reference} · {c.rate}% · {money(c.amount)} · {c.status}
            </p>
          ))
        ) : (
          <p>No commissions recorded.</p>
        )}
      </article>
    </div>
  );
}
export async function RealtorAdmin({
  db,
  tab,
}: {
  db: SupabaseClient;
  tab: string;
}) {
  const { data: members, error } = await db
    .from("realtor_members")
    .select("*")
    .order("created_at", { ascending: false });
  if (error)
    return (
      <p className="notice">
        Run the realtor, sales and team setup SQL in Supabase to enable this
        section.
      </p>
    );
  if (tab === "realtors")
    return (
      <div className="stack">
        <h2>Realtor applications</h2>
        <p>
          Registration is free. Review identity/contact details, experience and
          declared previous sales before approval. Referral relationships are
          fixed on application.
        </p>
        {members?.map((m) => (
          <article className="record" key={m.user_id}>
            <h3>
              {m.full_name} · {m.status}
            </h3>
            <p>
              {m.email} · {m.phone} · {m.experience_years} years in real estate
              · {m.previous_sales} declared completed sales
            </p>
            <p>
              Account: {m.user_id}
              <br />
              Referred by:{" "}
              {members.find((x) => x.user_id === m.referred_by)?.full_name ||
                "No referrer"}
            </p>
            <OperationForm action="review" values={{ user: m.user_id }}>
              <label className="field">
                Review decision
                <select name="status" defaultValue="approved">
                  <option value="approved">Approve</option>
                  <option value="rejected">Reject</option>
                  <option value="suspended">Suspend</option>
                </select>
              </label>
            </OperationForm>
          </article>
        ))}
        {!members?.length && <p>No applications yet.</p>}
      </div>
    );
  const [
    { data: props },
    { data: sales },
    { data: commissions },
    { data: instalments },
    { data: receipts },
  ] = await Promise.all([
    db
      .from("properties")
      .select("id,name")
      .eq("purpose", "For sale")
      .is("archived_at", null),
    db
      .from("realtor_sales")
      .select("*")
      .order("created_at", { ascending: false }),
    db.from("sale_commissions").select("*"),
    db.from("sale_instalments").select("*").order("sequence"),
    db.from("sale_receipts").select("*"),
  ]);
  return (
    <div className="stack">
      <SaleForm
        members={members?.filter((m) => m.status === "approved") || []}
        properties={props || []}
      />
      <p className="notice">
        Month 3 deadlines are provisional pending MICMU’s clarification. Verify
        all due dates with the buyer before confirming a sale. Missing referrer
        generations receive no automatic allocation. Discounted sales use only
        the agreed rates.
      </p>
      {sales?.map((s) => {
        const paid = (receipts || [])
          .filter((r) => r.sale_id === s.id)
          .reduce((n, r) => n + Number(r.amount), 0);
        return (
          <article className="record" key={s.id}>
            <h2>
              {s.reference} · {s.status}
            </h2>
            <p>
              {props?.find((p) => p.id === s.property_id)?.name ||
                s.property_id}{" "}
              · Seller:{" "}
              {members?.find((m) => m.user_id === s.seller_id)?.full_name}
              <br />
              Base: {money(s.base_price)} · Full agreed sale price:{" "}
              {money(s.full_price)} · {s.plan_months} month plan
              <br />
              Received: {money(paid)} · Balance: {money(s.full_price - paid)}
            </p>
            <h3>Payment schedule</h3>
            {instalments
              ?.filter((i) => i.sale_id === s.id)
              .map((i) => (
                <p key={i.id}>
                  {i.due_date} · {i.percentage}% · {money(i.amount)}
                  {s.status === "pending" && (
                    <OperationForm action="due-date" values={{ id: i.id }}>
                      <label className="field">
                        Agreed due date
                        <input
                          name="date"
                          type="date"
                          required
                          defaultValue={i.due_date}
                        />
                      </label>
                    </OperationForm>
                  )}
                </p>
              ))}
            {s.discounted && (
              <p>Discount agreement: {s.commission_agreement}</p>
            )}
            {s.status === "pending" && (
              <OperationForm action="confirm" values={{ sale: s.id }}>
                <h3>Confirm reviewed sale</h3>
                {s.discounted ? (
                  <div className="form-grid">
                    {[0, 1, 2].map((i) => (
                      <label className="field" key={i}>
                        Agreed rate: {i === 0 ? "seller" : `referrer ${i}`} (%)
                        <input
                          name={`rate${i}`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          required
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <p>
                    Standard commission: seller 10%, direct referrer 3%, next
                    referrer 2%.
                  </p>
                )}
                <label className="consent">
                  <input type="checkbox" required />I have reviewed the sale,
                  commission agreement and payment dates.
                </label>
              </OperationForm>
            )}
            {s.status === "confirmed" && (
              <OperationForm action="receipt" values={{ sale: s.id }}>
                <h3>Record payment received</h3>
                <label className="field">
                  Unique receipt reference
                  <input
                    name="reference"
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </label>
                <label className="field">
                  Amount received (₦)
                  <input
                    type="number"
                    name="amount"
                    required
                    min="0.01"
                    max={s.full_price - paid}
                    step="0.01"
                  />
                </label>
                <label className="field">
                  Received on
                  <input
                    type="date"
                    name="date"
                    required
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </label>
              </OperationForm>
            )}
            {s.status !== "cancelled" &&
              paid === 0 &&
              !(commissions || []).some(
                (c) => c.sale_id === s.id && c.status === "paid",
              ) && (
                <OperationForm action="cancel-sale" values={{ sale: s.id }}>
                  <label className="consent">
                    <input type="checkbox" required />
                    Cancel this sale and its unpaid commissions. No receipts or
                    paid commissions may exist.
                  </label>
                </OperationForm>
              )}
            <h3>Payment history</h3>
            {receipts
              ?.filter((r) => r.sale_id === s.id)
              .map((r) => (
                <p key={r.id}>
                  {r.reference} · {r.received_on} · {money(r.amount)}
                </p>
              ))}
            <h3>Commission records</h3>
            {commissions
              ?.filter((c) => c.sale_id === s.id)
              .map((c) => (
                <div className="record" key={c.generation}>
                  <p>
                    {
                      members?.find((m) => m.user_id === c.realtor_id)
                        ?.full_name
                    }{" "}
                    · {c.sale_reference} · {c.rate}% · {money(c.amount)} ·{" "}
                    {c.status}
                  </p>
                  {["pending", "approved"].includes(c.status) && (
                    <OperationForm
                      action="commission"
                      values={{ sale: s.id, generation: c.generation }}
                    >
                      <label className="field">
                        Update payout record
                        <select name="status">
                          <option
                            value={c.status === "pending" ? "approved" : "paid"}
                          >
                            {c.status === "pending"
                              ? "Approve commission"
                              : "Mark paid (after actual payment)"}
                          </option>
                          <option value="cancelled">Cancel commission</option>
                        </select>
                      </label>
                    </OperationForm>
                  )}
                </div>
              ))}
          </article>
        );
      })}
    </div>
  );
}
