# Realtor, sales, payment plan and team setup

The owner approved free realtor registration, declared experience and previous sales, administrator approval, direct-referral visibility, 10% seller / 3% direct sponsor / 2% next sponsor commission, and manual agreements for discounted sales. The 6-month surcharge is 5%, the 12-month surcharge is 10%, and the 3-month surcharge is zero. Commission uses the full price including the surcharge. Plans apply to all sale properties.

## Activate

1. In the MICMU Supabase SQL Editor run `supabase/migrations/202610290001_realtor_sales_team.sql` once. It adds tables/functions and team image/order columns. It preserves existing users, properties, enquiries, commissions and image storage. Existing legacy referral/commission tables are retained separately; new sales use the new ledger.
2. Wait for Cloudflare to deploy the source update. No additional keys, paid service, email mailbox or payment processor is configured by this change.
3. Ensure account signups and email confirmation are configured in Supabase for new realtor accounts. Set the real deployed `NEXT_PUBLIC_SITE_URL` and approved Supabase Auth redirect URLs before testing account creation/recovery. The owner should enable self-registration only when ready for public applicants.
4. Test with separate confirmed accounts before using actual financial records.

## Use

- Public `/become-a-realtor` explains free registration. Confirmed account holders apply at `/dashboard/realtor`, entering name, phone, years in real estate, previous completed sale count and optional referral code. The shared referral link remembers the code in the same browser; applicants should check it before submitting. Referral codes are accepted only from approved members. Once submitted, the relationship cannot be changed by the applicant.
- Administrators use `/admin/realtors` to review, approve, reject or suspend. Non-approved applicants cannot obtain new downlines. A realtor sees only direct referrals' names/status; private application details and deeper downlines are hidden.
- `/admin/sales` records the seller, property, price, plan, start date and any discounted agreement. Review the generated schedule and adjust draft due dates before confirming. Confirmation is atomic and cannot be duplicated. Standard commissions follow the recorded two sponsors, with no automatic reassignment of absent/inactive generations. Discounts require three explicitly agreed rates (zero permitted).
- Receipt references are unique; receipts cannot exceed the balance. Recording receipts is bookkeeping, not collecting money. Commission approval and actual paid status are separate manual events. Never mark a commission paid until a real payout is verified. No payout timing, payment gateway or automatic transfer has been implemented.
- Sales with no receipts or paid commissions can be cancelled; commission records are cancelled with them. Refunds/reversals of real payments require a separate reviewed workflow.
- `/payment-plans` provides the calculator; priced sale property pages include it. The initial example is ₦6m, not a published listing. MICMU confirmed that the month 3 instalment on both the 3-month and 6-month plans is due by the end of the third month. The administrator verifies the exact dates against the signed agreement before sale confirmation. Monthly dates are computed from the initial due date; exact contract dates may be edited while pending.
- `/admin/team`: use content type `team`, title = approved full name, summary = job title, body = biography, approved media path = portrait, display order = position. Leave unpublished until approved. Public profiles appear on `/about#team` only after publication. This grants no website login privileges.

## Checks

Automated PostgreSQL tests exercise applications/approvals, sponsor privacy, fixed referral chains, surcharge schedules, commission amounts, discounts, duplicate sale confirmation, payment limits and approval before paid status. API tests check origin/authentication/MFA and validation failures. Live multi-account testing is still required after the migration. `micmuproperties.com` is the agreed domain name; purchasing or configuring the domain/mailbox is outside this change.
