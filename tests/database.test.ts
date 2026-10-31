import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
const one = "11111111-1111-4111-8111-111111111111",
  two = "22222222-2222-4222-8222-222222222222",
  admin = "33333333-3333-4333-8333-333333333333";
let db: PGlite;
async function role(name: string, sub = one) {
  await db.exec(
    `reset role;set role ${name};set request.jwt.claims = '${JSON.stringify({ sub, role: name, aal: sub === admin ? "aal2" : "aal1" })}';`,
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz,deleted_at timestamptz);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub' $$;`.replace(
      "select nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'",
      "select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid",
    ),
  );
  await db.exec(
    `create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema public,auth,storage to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`,
  );
  for (const file of [
    "202610260001_core.sql",
    "202610260002_server_submission.sql",
    "202610260003_marketplace_requirements.sql",
    "202610260004_dashboard_notifications.sql",
    "202610260005_approved_people_content.sql",
    "202610280001_supabase_images.sql",
    "202610290001_realtor_sales_team.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.exec(
    `grant select,insert,update,delete on public.profiles,public.user_roles,public.properties,public.content,public.site_settings,public.enquiries,public.saved_properties,public.client_documents,public.payment_records,public.referrals,public.commissions,public.verification_records,public.media_assets,public.audit_logs to anon,authenticated;grant select,insert,update,delete on all tables in schema public to service_role;grant usage on all sequences in schema public to anon,authenticated,service_role;grant select on storage.objects to authenticated;insert into auth.users(id,email,email_confirmed_at) values('${one}','one@example.test',now()),('${two}','two@example.test',now()),('${admin}','admin@example.test',now());insert into public.user_roles values('${admin}','admin');insert into public.properties(slug,reference,name,location,category,size,description,published,review_status) values('public','PUB','Public','Test','Land','100 m²','Test',true,'Approved'),('draft','DRAFT','Draft','Test','Land','100 m²','Test',false,'Pending');insert into public.profiles(id,full_name) values('${one}','One'),('${two}','Two');insert into public.payment_records(user_id,reference,amount,status) values('${one}','ONE',100,'received'),('${two}','TWO',200,'received');`,
  );
  // Apply the new migration to populated tables with existing Supabase-style grants.
  await db.exec(
    readFileSync("supabase/migrations/202610310001_staff_access.sql", "utf8"),
  );
});
afterAll(async () => {
  await db.close();
});
describe("PostgreSQL migrations and access rules", () => {
  it("anonymous users see published properties only", async () => {
    await role("anon");
    const r = await db.query("select reference from public.properties");
    expect(r.rows).toEqual([{ reference: "PUB" }]);
  });
  it("a client cannot see another client profile or payment", async () => {
    await role("authenticated");
    expect(
      (await db.query("select full_name from public.profiles")).rows,
    ).toEqual([{ full_name: "One" }]);
    expect(
      (await db.query("select reference from public.payment_records")).rows,
    ).toEqual([{ reference: "ONE" }]);
  });
  it("a client cannot promote themselves or change a property", async () => {
    await role("authenticated");
    await expect(
      db.exec(`insert into public.user_roles values('${one}','admin')`),
    ).rejects.toThrow(/permission denied|row-level security/);
    expect(
      (
        await db.query(
          `update public.properties set price=1 where reference='PUB' returning id`,
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("an administrator at aal1 cannot write through the database", async () => {
    await role("authenticated", admin);
    await db.exec(
      `set request.jwt.claims = '{"sub":"${admin}","role":"authenticated","aal":"aal1"}'`,
    );
    expect(
      (
        await db.query(
          `update public.properties set price=1 where reference='PUB' returning id`,
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("an administrator can publish and changes are audited", async () => {
    await role("authenticated", admin);
    await db.exec(
      `update public.properties set published=true,review_status='Approved' where reference='DRAFT'`,
    );
    expect(
      (
        await db.query(
          `select * from public.audit_logs where action='UPDATE' and table_name='properties'`,
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("the public key cannot bypass the server submission gateway", async () => {
    await role("anon");
    await expect(
      db.query(`select public.submit_enquiry('{}'::jsonb,null)`),
    ).rejects.toThrow(/permission denied/);
  });
  it("server submissions persist, deduplicate, enforce rate limits and preserve ownership", async () => {
    await role("service_role");
    const payload = {
      kind: "contact",
      name: "One",
      email: "one@example.test",
      phone: "+2348000000000",
      message: "Test",
      consent: true,
      request_id: crypto.randomUUID(),
    };
    const first = await db.query<{ id: string }>(
      "select public.submit_enquiry($1::jsonb,$2::uuid) as id",
      [JSON.stringify(payload), one],
    );
    const retry = await db.query<{ id: string }>(
      "select public.submit_enquiry($1::jsonb,$2::uuid) as id",
      [JSON.stringify(payload), two],
    );
    expect(retry.rows[0].id).toBe(first.rows[0].id);
    expect(
      (
        await db.query<{ user_id: string }>(
          "select user_id from enquiries where id=$1",
          [first.rows[0].id],
        )
      ).rows[0].user_id,
    ).toBe(one);
    for (let i = 0; i < 4; i++)
      await db.query("select public.submit_enquiry($1::jsonb,$2::uuid)", [
        JSON.stringify({ ...payload, request_id: crypto.randomUUID() }),
        one,
      ]);
    await expect(
      db.query("select public.submit_enquiry($1::jsonb,$2::uuid)", [
        JSON.stringify({ ...payload, request_id: crypto.randomUUID() }),
        one,
      ]),
    ).rejects.toThrow(/rate limit/);
  });
  it("clients only see requests attached to their verified account", async () => {
    await role("authenticated", two);
    expect((await db.query("select * from enquiries")).rows).toHaveLength(0);
    await role("authenticated", one);
    expect((await db.query("select * from enquiries")).rows).toHaveLength(5);
  });
  it("a booking cannot target an unpublished or unavailable property", async () => {
    await role("service_role");
    await expect(
      db.query("select public.submit_enquiry($1::jsonb,null)", [
        JSON.stringify({
          kind: "inspection",
          name: "Test",
          email: "book@example.test",
          consent: true,
          request_id: crypto.randomUUID(),
          property_id: crypto.randomUUID(),
          date: "2099-01-01",
          time: "09:00",
        }),
      ]),
    ).rejects.toThrow(/Property unavailable/);
  });
  it("requires approval before publication and keeps archived properties private", async () => {
    await role("authenticated", admin);
    await expect(
      db.exec(
        `insert into properties(slug,reference,name,location,category,size,description,published,review_status) values('bad','BAD','Bad','Test','Land','100','Test',true,'Pending')`,
      ),
    ).rejects.toThrow(/properties_publish_review/);
    await db.exec(
      `insert into properties(slug,reference,name,location,category,size,description,published,review_status,archived_at) values('archive','ARCHIVE','Archived','Test','House','100','Test',false,'Approved',now())`,
    );
    await role("anon");
    expect(
      (await db.query(`select * from properties where reference='ARCHIVE'`))
        .rows,
    ).toHaveLength(0);
  });
  it("enforces rental period and status consistency in PostgreSQL", async () => {
    await role("authenticated", admin);
    await expect(
      db.exec(
        `insert into properties(slug,reference,name,location,category,size,description,purpose,price_period) values('bad-rent','RENT','Test','Test','House','100','Test','For rent','Total')`,
      ),
    ).rejects.toThrow(/properties_price_period/);
    await expect(
      db.exec(`update properties set status='Rented' where reference='PUB'`),
    ).rejects.toThrow(/properties_status_purpose/);
  });
  it("isolates saved searches and prevents assigning them to someone else", async () => {
    await role("authenticated", one);
    await db.exec(
      `insert into saved_searches(user_id,name,filters) values('${one}','My rental search','{"purpose":"For rent"}')`,
    );
    await expect(
      db.exec(
        `insert into saved_searches(user_id,name,filters) values('${two}','Not mine','{}')`,
      ),
    ).rejects.toThrow(/row-level security/);
    await role("authenticated", two);
    expect((await db.query("select * from saved_searches")).rows).toHaveLength(
      0,
    );
  });
  it("notifies the favourite owner after status changes and keeps notices private", async () => {
    await role("authenticated", one);
    await db.exec(
      `insert into saved_properties(user_id,property_id) select '${one}',id from properties where reference='PUB'`,
    );
    await role("authenticated", admin);
    await db.exec(`update properties set status='Sold' where reference='PUB'`);
    await role("authenticated", one);
    expect(
      (
        await db.query(
          `select * from notifications where title='A saved property has changed'`,
        )
      ).rows,
    ).toHaveLength(1);
    await expect(
      db.exec(`update notifications set message='Forged notice'`),
    ).rejects.toThrow(/permission denied/);
    await db.exec(`update notifications set read_at=now()`);
    await role("authenticated", two);
    expect((await db.query(`select * from notifications`)).rows).toHaveLength(
      0,
    );
  });
});

describe("Supabase image storage access", () => {
  it("allows only approved images to anonymous readers without exposing metadata", async () => {
    await db.exec(
      "reset role; grant select,insert,update,delete on storage.objects to anon,authenticated;",
    );
    await db.exec(`insert into public.media_assets(id,filename,object_key,content_type,source,category,approved) values
      ('44444444-4444-4444-8444-444444444444','approved.png','supabase/approved/visible','image/png','test permission','test',true),
      ('55555555-5555-4555-8555-555555555555','private.png','supabase/approved/hidden','image/png','private evidence','test',false);
      insert into storage.objects(bucket_id,name) values
      ('micmu-images','supabase/approved/visible'),('micmu-images','supabase/approved/hidden'),('micmu-images','supabase/approved/orphan');`);
    await role("anon");
    expect(
      (
        await db.query(
          "select name from storage.objects where bucket_id='micmu-images'",
        )
      ).rows,
    ).toEqual([{ name: "supabase/approved/visible" }]);
    expect(
      (await db.query("select * from public.media_assets")).rows,
    ).toHaveLength(0);
  });
  it("denies client and aal1 admin uploads, permits aal2 admin, and supports cleanup", async () => {
    for (const user of [one, admin]) {
      await role("authenticated", user);
      await db.exec(
        `set request.jwt.claims = '{"sub":"${user}","role":"authenticated","aal":"aal1"}'`,
      );
      await expect(
        db.exec(
          "insert into storage.objects(bucket_id,name) values('micmu-images','supabase/approved/blocked')",
        ),
      ).rejects.toThrow(/row-level security/);
    }
    await role("authenticated", admin);
    await db.exec(
      "insert into storage.objects(bucket_id,name) values('micmu-images','supabase/approved/cleanup')",
    );
    expect(
      (
        await db.query(
          "delete from storage.objects where name='supabase/approved/cleanup' returning name",
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("storage setup can be safely rerun", async () => {
    await db.exec("reset role");
    await db.exec(
      readFileSync(
        "supabase/migrations/202610280001_supabase_images.sql",
        "utf8",
      ),
    );
    expect(
      (
        await db.query(
          "select public,file_size_limit from storage.buckets where id='micmu-images'",
        )
      ).rows,
    ).toEqual([{ public: false, file_size_limit: 5242880 }]);
  });
});

describe("Realtor referral and sales rules", () => {
  const c = "66666666-6666-4666-8666-666666666666";
  const outsider = "77777777-7777-4777-8777-777777777777";
  let sale: string;
  it("registers free applications with fixed sponsor chain and approval", async () => {
    await db.exec(
      `reset role;insert into auth.users(id,email,email_confirmed_at) values('${c}','c@example.test',now()),('${outsider}','out@example.test',now());`,
    );
    await role("authenticated", one);
    await db.exec(
      "select public.apply_realtor('Realtor A','07012345678',2,3,'')",
    );
    await role("authenticated", admin);
    await db.exec(`select public.review_realtor('${one}','approved')`);
    const acode = (
      await db.query<{ referral_code: string }>(
        `select referral_code from public.realtor_members where user_id='${one}'`,
      )
    ).rows[0].referral_code;
    await role("authenticated", two);
    await db.query(
      "select public.apply_realtor('Realtor B','07012345678',1,2,$1)",
      [acode],
    );
    await role("authenticated", admin);
    await db.exec(`select public.review_realtor('${two}','approved')`);
    const bcode = (
      await db.query<{ referral_code: string }>(
        `select referral_code from public.realtor_members where user_id='${two}'`,
      )
    ).rows[0].referral_code;
    await role("authenticated", c);
    await db.query(
      "select public.apply_realtor('Realtor C','07012345678',0,0,$1)",
      [bcode],
    );
    await expect(
      db.exec("select public.apply_realtor('Duplicate','07012345678',0,0,'')"),
    ).rejects.toThrow(/already submitted/);
    await role("authenticated", admin);
    await db.exec(`select public.review_realtor('${c}','approved')`);
  });
  it("exposes direct downlines only and blocks self-approval and writes", async () => {
    await role("authenticated", one);
    const rows = (
      await db.query<{ user_id: string }>(
        "select user_id from public.my_direct_downlines()",
      )
    ).rows.map((r) => r.user_id);
    expect(rows).toContain(two);
    expect(rows).not.toContain(c);
    await expect(
      db.exec(`select public.review_realtor('${c}','approved')`),
    ).rejects.toThrow(/administrator/);
    await expect(
      db.exec(
        `update public.realtor_members set referred_by='${c}' where user_id='${one}'`,
      ),
    ).rejects.toThrow();
  });
  it("calculates surcharges and instalments exactly, then allocates 10/3/2 including surcharge", async () => {
    await role("authenticated", admin);
    const prop = (
      await db.query<{ id: string }>(
        "select id from public.properties where reference='PUB'",
      )
    ).rows[0].id;
    sale = (
      await db.query<{ id: string }>(
        `select public.create_realtor_sale('SALE-TEST','${prop}','${c}',6000000,6,false,1,'','2026-11-01') as id`,
      )
    ).rows[0].id;
    expect(
      (
        await db.query<{ full_price: string }>(
          `select full_price from public.realtor_sales where id='${sale}'`,
        )
      ).rows[0].full_price,
    ).toBe("6300000.00");
    const instalments = (
      await db.query<{ amount: string }>(
        `select amount from public.sale_instalments where sale_id='${sale}' order by sequence`,
      )
    ).rows.map((r) => Number(r.amount));
    expect(instalments).toEqual([2520000, 1260000, 1260000, 1260000]);
    await db.exec(`select public.confirm_realtor_sale('${sale}')`);
    expect(
      (
        await db.query<{ realtor_id: string; amount: string }>(
          `select realtor_id,amount from public.sale_commissions where sale_id='${sale}' order by generation`,
        )
      ).rows,
    ).toEqual([
      { realtor_id: c, amount: "630000.00" },
      { realtor_id: two, amount: "189000.00" },
      { realtor_id: one, amount: "126000.00" },
    ]);
    await expect(
      db.exec(`select public.confirm_realtor_sale('${sale}')`),
    ).rejects.toThrow(/already processed/);
  });
  it("keeps sales private and shows only a realtor's commission", async () => {
    await role("authenticated", one);
    expect(
      (await db.query("select * from public.realtor_sales")).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select * from public.sale_commissions")).rows,
    ).toHaveLength(1);
    await role("authenticated", outsider);
    expect(
      (await db.query("select * from public.sale_commissions")).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select * from public.sale_receipts")).rows,
    ).toHaveLength(0);
  });
  it("records payments once, prevents overpayment, and requires payout approval", async () => {
    await role("authenticated", admin);
    await db.exec(
      `select public.record_sale_receipt('${sale}','RCPT-TEST',2520000,'2026-01-01')`,
    );
    await expect(
      db.exec(
        `select public.record_sale_receipt('${sale}','RCPT-TEST',1,'2026-01-01')`,
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(
        `select public.record_sale_receipt('${sale}','OVER',6300000,'2026-01-01')`,
      ),
    ).rejects.toThrow(/Invalid payment/);
    await expect(
      db.exec(`select public.set_sale_commission_status('${sale}',0,'paid')`),
    ).rejects.toThrow(/transition/);
    await db.exec(
      `select public.set_sale_commission_status('${sale}',0,'approved');select public.set_sale_commission_status('${sale}',0,'paid');`,
    );
  });
  it("permits correcting draft dates, cancels only unpaid sales and audits the changes", async () => {
    await role("authenticated", admin);
    const prop = (
      await db.query<{ id: string }>(
        "select id from public.properties where reference='PUB'",
      )
    ).rows[0].id;
    const draft = (
      await db.query<{ id: string }>(
        `select public.create_realtor_sale('CANCEL','${prop}','${c}',6000000,3,false,1,'','2026-11-01') as id`,
      )
    ).rows[0].id;
    const instalment = (
      await db.query<{ id: string }>(
        `select id from public.sale_instalments where sale_id='${draft}' and sequence=3`,
      )
    ).rows[0].id;
    await db.exec(
      `select public.set_instalment_date('${instalment}','2027-01-30')`,
    );
    await db.exec(`select public.cancel_realtor_sale('${draft}')`);
    await expect(
      db.exec(`select public.confirm_realtor_sale('${draft}')`),
    ).rejects.toThrow();
    await expect(
      db.exec(`select public.cancel_realtor_sale('${sale}')`),
    ).rejects.toThrow(/Payments exist/);
    expect(
      (
        await db.query(
          `select id from public.audit_logs where table_name='realtor_sales' and record_id='${draft}'`,
        )
      ).rows.length,
    ).toBeGreaterThan(1);
  });
  it("does not apply standard commissions to discounts", async () => {
    await role("authenticated", admin);
    const prop = (
      await db.query<{ id: string }>(
        "select id from public.properties where reference='PUB'",
      )
    ).rows[0].id;
    const discount = (
      await db.query<{ id: string }>(
        `select public.create_realtor_sale('DISCOUNT','${prop}','${c}',6000000,3,true,5500000,'Agreed special rates in signed agreement','2026-11-01') as id`,
      )
    ).rows[0].id;
    await expect(
      db.exec(`select public.confirm_realtor_sale('${discount}')`),
    ).rejects.toThrow(/agreed rates/);
    await db.exec(
      `select public.confirm_realtor_sale('${discount}','[8,2,1]')`,
    );
    expect(
      (
        await db.query<{ amount: string }>(
          `select amount from public.sale_commissions where sale_id='${discount}' order by generation`,
        )
      ).rows.map((r) => Number(r.amount)),
    ).toEqual([440000, 110000, 55000]);
  });
});

describe("Owner-only staff access", () => {
  const owner = "88888888-8888-4888-8888-888888888888";
  const unconfirmed = "99999999-9999-4999-8999-999999999999";
  async function ownerSession(aal = "aal2") {
    await role("authenticated", owner);
    await db.exec(
      `set request.jwt.claims = '{"sub":"${owner}","role":"authenticated","aal":"${aal}"}'`,
    );
  }
  it("does not assign an owner during migration; ordinary administrators cannot bootstrap", async () => {
    await db.exec("reset role");
    expect((await db.query("select * from company_owner")).rows).toHaveLength(
      0,
    );
    await role("authenticated", admin);
    await expect(
      db.exec(`insert into company_owner(user_id) values('${admin}')`),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.exec(`select set_staff_administrator('${admin}',true)`),
    ).rejects.toThrow(/company owner/);
    await db.exec(
      `reset role;insert into auth.users(id,email,email_confirmed_at) values('${owner}','owner@example.test',now()),('${unconfirmed}','unconfirmed@example.test',null)`,
    );
    await expect(
      db.exec(`insert into company_owner(user_id) values('${unconfirmed}')`),
    ).rejects.toThrow(/confirmed/);
    await db.exec(`insert into company_owner(user_id) values('${owner}')`);
    expect(
      (
        await db.query(
          `select * from user_roles where user_id='${owner}' and role='admin'`,
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("denies anonymous users, realtors, ordinary admins, and service credentials", async () => {
    for (const user of [one, admin]) {
      await role("authenticated", user);
      for (const query of [
        "select list_staff_access()",
        "select find_staff_account('two@example.test')",
        `select set_staff_administrator('${user}',true)`,
      ])
        await expect(db.exec(query)).rejects.toThrow(/company owner/);
      await expect(
        db.exec(`insert into user_roles values('${user}','admin')`),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.exec(`insert into company_owner(user_id) values('${user}')`),
      ).rejects.toThrow(/permission denied/);
    }
    for (const name of ["anon", "service_role"]) {
      await role(name);
      await expect(
        db.exec(`select set_staff_administrator('${one}',true)`),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.exec(`insert into user_roles values('${one}','admin')`),
      ).rejects.toThrow(/permission denied/);
    }
  });
  it("denies the owner at AAL1 including directory reads", async () => {
    await ownerSession("aal1");
    expect(
      (await db.query<{ value: boolean }>("select is_company_owner() as value"))
        .rows[0].value,
    ).toBe(false);
    await expect(
      db.exec(`select set_staff_administrator('${two}',true)`),
    ).rejects.toThrow(/company owner/);
    await expect(db.exec("select list_staff_access()")).rejects.toThrow(
      /company owner/,
    );
  });
  it("looks up only confirmed eligible accounts by exact email", async () => {
    await ownerSession();
    expect(
      (await db.query("select * from find_staff_account(' TWO@example.test ')"))
        .rows,
    ).toEqual([
      {
        user_id: two,
        email: "two@example.test",
        full_name: "Two",
        is_administrator: false,
        is_owner: false,
      },
    ]);
    for (const email of [
      "unconfirmed@example.test",
      "%@example.test",
      "missing@example.test",
    ])
      expect(
        (await db.query("select * from find_staff_account($1)", [email])).rows,
      ).toHaveLength(0);
    await expect(
      db.exec(`select set_staff_administrator('${unconfirmed}',true)`),
    ).rejects.toThrow(/confirmed/);
    await expect(
      db.exec(`select set_staff_administrator('${crypto.randomUUID()}',true)`),
    ).rejects.toThrow(/confirmed/);
  });
  it("grants/revokes only admin, audits actor and target, and deduplicates retries", async () => {
    await ownerSession();
    await db.exec(
      `select set_staff_administrator('${two}',true);select set_staff_administrator('${two}',true)`,
    );
    expect(
      (
        await db.query(
          `select * from user_roles where user_id='${two}' and role='admin'`,
        )
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query(
          `select action,actor_id,target_id from staff_access_events where target_id='${two}'`,
        )
      ).rows,
    ).toEqual([{ action: "admin_granted", actor_id: owner, target_id: two }]);
    await role("authenticated", two);
    await db.exec(
      `set request.jwt.claims = '{"sub":"${two}","role":"authenticated","aal":"aal2"}'`,
    );
    expect(
      (await db.query<{ allowed: boolean }>("select is_admin() as allowed"))
        .rows[0].allowed,
    ).toBe(true);
    await expect(
      db.exec(`select set_staff_administrator('${two}',true)`),
    ).rejects.toThrow(/company owner/);
    await ownerSession();
    await db.exec(
      `select set_staff_administrator('${two}',false);select set_staff_administrator('${two}',false)`,
    );
    expect(
      (await db.query(`select role from user_roles where user_id='${two}'`))
        .rows,
    ).toContainEqual({ role: "realtor" });
    expect(
      (
        await db.query(
          `select * from staff_access_events where target_id='${two}'`,
        )
      ).rows,
    ).toHaveLength(2);
    expect(
      (
        await db.query(
          `select * from audit_logs where table_name='user_roles' and record_id='${two}' and actor_id='${owner}'`,
        )
      ).rows,
    ).toHaveLength(2);
    await role("authenticated", two);
    await db.exec(
      `set request.jwt.claims = '{"sub":"${two}","role":"authenticated","aal":"aal2"}'`,
    );
    expect(
      (await db.query<{ allowed: boolean }>("select is_admin() as allowed"))
        .rows[0].allowed,
    ).toBe(false);
  });
  it("protects the last owner, admin role, auth account and singleton even from maintenance mistakes", async () => {
    await ownerSession();
    await expect(
      db.exec(`select set_staff_administrator('${owner}',false)`),
    ).rejects.toThrow(/retain administrator/);
    await db.exec("reset role");
    for (const query of [
      "delete from company_owner",
      `update company_owner set user_id='${admin}'`,
      "truncate company_owner",
      `delete from user_roles where user_id='${owner}' and role='admin'`,
      `update user_roles set role='client' where user_id='${owner}' and role='admin'`,
      "truncate user_roles",
    ])
      await expect(db.exec(query)).rejects.toThrow(/company owner/);
    await expect(
      db.exec(`delete from auth.users where id='${owner}'`),
    ).rejects.toThrow(/foreign key|company owner/);
    await expect(
      db.exec(`insert into company_owner(user_id) values('${admin}')`),
    ).rejects.toThrow(/duplicate key/);
  });
  it("rejects disabled targets and never grants permissions via public team content", async () => {
    await db.exec(
      `reset role;update auth.users set banned_until=now()+interval '1 day' where id='${unconfirmed}';update auth.users set email_confirmed_at=now() where id='${unconfirmed}'`,
    );
    await ownerSession();
    await expect(
      db.exec(`select set_staff_administrator('${unconfirmed}',true)`),
    ).rejects.toThrow(/confirmed/);
    await db.exec(
      `insert into content(kind,slug,title,summary,body,published) values('team','staff-test-profile','Public profile','Team member','Biography',true)`,
    );
    expect(
      (
        await db.query(
          `select * from user_roles where user_id='${unconfirmed}'`,
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("keeps access history private and prevents editing or forging it", async () => {
    await role("authenticated", admin);
    expect(
      (await db.query("select * from staff_access_events")).rows,
    ).toHaveLength(0);
    await expect(
      db.exec(
        `insert into staff_access_events(target_id,action) values('${one}','admin_granted')`,
      ),
    ).rejects.toThrow(/permission denied/);
    await ownerSession();
    expect(
      (await db.query("select * from list_staff_access()")).rows,
    ).toHaveLength(2);
    await expect(db.exec("delete from staff_access_events")).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      db.exec("update staff_access_events set action='admin_revoked'"),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("Staff access rollback and setup", () => {
  it("rolls back role changes if their audit event fails", async () => {
    const owner = "88888888-8888-4888-8888-888888888888";
    await db.exec(`reset role;
      create function public.test_reject_staff_event() returns trigger language plpgsql as $$ begin raise exception 'audit unavailable'; end; $$;
      create trigger test_reject_staff_event before insert on public.staff_access_events for each row execute function public.test_reject_staff_event();`);
    try {
      await role("authenticated", owner);
      await db.exec(
        `set request.jwt.claims = '{"sub":"${owner}","role":"authenticated","aal":"aal2"}'`,
      );
      await expect(
        db.exec(`select set_staff_administrator('${two}',true)`),
      ).rejects.toThrow(/audit unavailable/);
      expect(
        (
          await db.query(
            `select * from user_roles where user_id='${two}' and role='admin'`,
          )
        ).rows,
      ).toHaveLength(0);
      expect(
        (
          await db.query(
            `select * from audit_logs where table_name='user_roles' and record_id='${two}' and actor_id='${owner}'`,
          )
        ).rows,
      ).toHaveLength(2);
    } finally {
      await db.exec(
        "reset role;drop trigger test_reject_staff_event on public.staff_access_events;drop function public.test_reject_staff_event()",
      );
    }
  });
  it("bootstrap requires an explicitly identified owner and refuses replacement", async () => {
    await db.exec("reset role");
    const bootstrap = readFileSync("docs/STAFF_OWNER_BOOTSTRAP.sql", "utf8");
    await expect(db.exec(bootstrap)).rejects.toThrow(
      /Identify the company owner/,
    );
    const forEmail = (email: string) =>
      bootstrap.replace(
        "owner_email text := 'REPLACE_WITH_CONFIRMED_COMPANY_OWNER_EMAIL'",
        `owner_email text := '${email}'`,
      );
    await db.exec(forEmail("owner@example.test"));
    await expect(db.exec(forEmail("admin@example.test"))).rejects.toThrow(
      /different company owner/,
    );
    await expect(db.exec(forEmail("missing@example.test"))).rejects.toThrow(
      /no rows/,
    );
  });
});
