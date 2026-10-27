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
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub' $$;`.replace(
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
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.exec(
    `grant select,insert,update,delete on public.profiles,public.user_roles,public.properties,public.content,public.site_settings,public.enquiries,public.saved_properties,public.client_documents,public.payment_records,public.referrals,public.commissions,public.verification_records,public.media_assets,public.audit_logs to anon,authenticated;grant select,insert,update,delete on all tables in schema public to service_role;grant usage on all sequences in schema public to anon,authenticated,service_role;grant select on storage.objects to authenticated;insert into auth.users(id,email,email_confirmed_at) values('${one}','one@example.test',now()),('${two}','two@example.test',now()),('${admin}','admin@example.test',now());insert into public.user_roles values('${admin}','admin');insert into public.properties(slug,reference,name,location,category,size,description,published,review_status) values('public','PUB','Public','Test','Land','100 m²','Test',true,'Approved'),('draft','DRAFT','Draft','Test','Land','100 m²','Test',false,'Pending');insert into public.profiles(id,full_name) values('${one}','One'),('${two}','Two');insert into public.payment_records(user_id,reference,amount,status) values('${one}','ONE',100,'received'),('${two}','TWO',200,'received');`,
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
    ).rejects.toThrow(/row-level security/);
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
