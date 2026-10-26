-- MICMU: FIRST-TIME SETUP FOR THE NEW micmu-properties PROJECT ONLY.
-- Creates website tables and access rules; does not create an admin password.
-- Run once. If tables already exist, stop and report the error.
BEGIN;


-- Source: 202610260001_core.sql
-- Apply to a new Supabase project. No business inventory or admin credentials are seeded.

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '' check(length(full_name)<=120), created_at timestamptz not null default now()
);
create table public.user_roles (
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','client','realtor')), primary key(user_id,role)
);
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin') and coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'aal'='aal2';
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.properties (
 id uuid primary key default gen_random_uuid(), slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 reference text not null unique, name text not null, location text not null,
 category text not null check(category in ('Land','House','Apartment')), price numeric(16,2) check(price>=0),
 size text not null, bedrooms integer check(bedrooms between 0 and 100), bathrooms integer check(bathrooms between 0 and 100),
 status text not null default 'Available' check(status in ('Available','Reserved','Sold')),
 description text not null, features text[] not null default '{}', image_url text,
 published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(image_url is null or image_url ~ '^/api/media/[0-9a-f-]{36}$')
);
create index properties_public_search on public.properties(category,status,price) where published;
create table public.content (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('article','estate','development','business','faq')),
 slug text not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), title text not null,summary text not null,body text not null,
 published boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(kind,slug)
);
create index content_published on public.content(kind,created_at desc) where published;
create table public.site_settings (id text primary key check(id='public'),value jsonb not null default '{}',updated_at timestamptz not null default now());
insert into public.site_settings(id,value) values('public','{"facebook":"https://www.facebook.com/micmuproperties1"}');
create table public.enquiries (
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique,
 user_id uuid references auth.users(id) on delete set null,
 kind text not null check(kind in ('contact','inspection','realtor','partnership','support')),
 payload jsonb not null,status text not null default 'pending' check(status in ('pending','confirmed','completed','cancelled','approved','rejected')),
 email_hash text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index enquiries_owner on public.enquiries(user_id,kind,created_at desc);
create index enquiries_rate on public.enquiries(email_hash,created_at desc);
create table public.saved_properties (
 user_id uuid not null references auth.users(id) on delete cascade,property_id uuid not null references public.properties(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(user_id,property_id)
);
create table public.client_documents (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,storage_path text not null unique,created_at timestamptz not null default now()
);
create table public.payment_records (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 reference text not null unique,amount numeric(16,2) not null check(amount>=0),status text not null check(status in ('pending','received','refunded')),
 created_at timestamptz not null default now()
);
create index payments_owner on public.payment_records(user_id);
create table public.referrals (
 id uuid primary key default gen_random_uuid(),realtor_id uuid not null references auth.users(id) on delete cascade,
 reference text not null unique,status text not null default 'pending' check(status in ('pending','qualified','completed','cancelled')),created_at timestamptz not null default now()
);
create table public.commissions (
 id uuid primary key default gen_random_uuid(),realtor_id uuid not null references auth.users(id) on delete cascade,
 referral_id uuid references public.referrals(id),reference text not null unique,amount numeric(16,2) not null check(amount>=0),
 status text not null check(status in ('pending','approved','paid','cancelled')),created_at timestamptz not null default now()
);
create index commissions_owner on public.commissions(realtor_id);
create table public.verification_records (
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('property','representative')),
 reference text not null,public_label text not null,status text not null check(status in ('active','revoked','expired')),
 published boolean not null default false,created_at timestamptz not null default now(),unique(kind,reference)
);
create table public.media_assets (
 id uuid primary key,filename text not null,object_key text not null unique,content_type text not null check(content_type in ('image/jpeg','image/png','image/webp')),
 source text not null,category text not null,property_reference text,approved boolean not null default false,
 uploaded_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create table public.audit_logs (
 id bigint generated always as identity primary key,actor_id uuid,action text not null,table_name text not null,record_id text,
 created_at timestamptz not null default now()
);

-- Every application table is protected. Admin role assignment has no client write policy.
alter table public.profiles enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy profile_insert on public.profiles for insert to authenticated with check(id=auth.uid());
create policy profile_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
alter table public.user_roles enable row level security;
create policy roles_read on public.user_roles for select to authenticated using(user_id=auth.uid() or public.is_admin());

alter table public.properties enable row level security;
create policy properties_public on public.properties for select to anon,authenticated using(published or public.is_admin());
create policy properties_admin on public.properties for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.content enable row level security;
create policy content_public on public.content for select to anon,authenticated using(published or public.is_admin());
create policy content_admin on public.content for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.site_settings enable row level security;
create policy settings_public on public.site_settings for select to anon,authenticated using(true);
create policy settings_admin on public.site_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.enquiries enable row level security;
create policy enquiries_read on public.enquiries for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy enquiries_update on public.enquiries for update to authenticated using(public.is_admin()) with check(public.is_admin());
-- No direct anonymous inserts: only the narrowly scoped server RPC below may create a request.
alter table public.saved_properties enable row level security;
create policy saves_read on public.saved_properties for select to authenticated using(user_id=auth.uid());
create policy saves_insert on public.saved_properties for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.properties p where p.id=property_id and p.published));
create policy saves_update on public.saved_properties for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy saves_delete on public.saved_properties for delete to authenticated using(user_id=auth.uid());
alter table public.client_documents enable row level security;
create policy documents_owner on public.client_documents for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy documents_admin on public.client_documents for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.payment_records enable row level security;
create policy payments_owner on public.payment_records for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy payments_admin on public.payment_records for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.referrals enable row level security;
create policy referrals_owner on public.referrals for select to authenticated using(realtor_id=auth.uid() or public.is_admin());
create policy referrals_admin on public.referrals for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.commissions enable row level security;
create policy commissions_owner on public.commissions for select to authenticated using(realtor_id=auth.uid() or public.is_admin());
create policy commissions_admin on public.commissions for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.verification_records enable row level security;
create policy verification_public on public.verification_records for select to anon,authenticated using(published or public.is_admin());
create policy verification_admin on public.verification_records for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.media_assets enable row level security;
-- Ownership evidence is visible only to admins. Public delivery is handled by a projection RPC.
create policy media_admin on public.media_assets for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.audit_logs enable row level security;
create policy audit_admin on public.audit_logs for select to authenticated using(public.is_admin());

create function public.touch_updated() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now();return new;end; $$;
create function public.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
 begin insert into public.audit_logs(actor_id,action,table_name,record_id) values(auth.uid(),tg_op,tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id',to_jsonb(new)->>'user_id',to_jsonb(old)->>'user_id'));return coalesce(new,old);end;
$$;
revoke all on function public.audit_change() from public;
do $$ declare t text; begin
 foreach t in array array['properties','content','site_settings','enquiries'] loop
 execute format('create trigger touch_updated before update on public.%I for each row execute function public.touch_updated()',t);
 end loop;
 foreach t in array array['properties','content','site_settings','enquiries','media_assets','user_roles','client_documents','payment_records','referrals','commissions','verification_records'] loop
 execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function public.audit_change()',t);
 end loop;
end $$;

-- Public submissions require server Turnstile verification. Only the server credential may call this RPC.
create function public.submit_enquiry(payload jsonb,caller_id uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
 declare result uuid; email_digest text; req uuid; k text; begin
 if coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then raise exception 'Forbidden';end if;
 if length(payload::text)>16000 then raise exception 'Request too large';end if;
 k=payload->>'kind';
 if k not in ('contact','inspection','realtor','partnership','support') or k is null or coalesce(length(payload->>'name'),0) not between 1 and 120 or coalesce(length(payload->>'email'),0) not between 3 and 254 or coalesce(payload->>'consent','false')<>'true' then raise exception 'Invalid request';end if;
 req=(payload->>'request_id')::uuid;
 if req is null then raise exception 'Missing request id';end if;
 email_digest=encode(sha256(convert_to(lower(trim(payload->>'email')),'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(email_digest,0));
 select id into result from public.enquiries e where e.request_id=req and e.email_hash=email_digest;
 if result is not null then return result;end if;
 if (select count(*) from public.enquiries where email_hash=email_digest and created_at>now()-interval '1 hour')>=5 then raise exception 'rate limit';end if;
 if k='inspection' then
  if not exists(select 1 from public.properties where id=(payload->>'property_id')::uuid and published and status='Available') then raise exception 'Property unavailable';end if;
  if (payload->>'date')::date < (now() at time zone 'Africa/Lagos')::date or (payload->>'time') not in ('09:00','11:00','13:00','15:00') then raise exception 'Invalid inspection time';end if;
 end if;
 insert into public.enquiries(request_id,user_id,kind,payload,email_hash) values(req,caller_id,k,payload-'request_id',email_digest) returning id into result;
 return result;
 end;
$$;
revoke all on function public.submit_enquiry(jsonb,uuid) from public,anon,authenticated;
-- A dedicated server-only role/key is not used in the browser. Server route calls a validated
-- RPC using service_role and passes an optional caller id with a second migration.

create function public.approve_realtor(application_id uuid) returns void language plpgsql security definer set search_path='' as $$
 declare applicant uuid; email_address text; begin
 if not public.is_admin() then raise exception 'Forbidden';end if;
 select payload->>'email' into email_address from public.enquiries where id=application_id and kind='realtor';
 select id into applicant from auth.users where lower(email)=lower(email_address) and email_confirmed_at is not null;
 if applicant is null then raise exception 'A confirmed account is required';end if;
 insert into public.user_roles(user_id,role) values(applicant,'realtor') on conflict do nothing;
 update public.enquiries set status='approved' where id=application_id;
 end;
$$;
revoke all on function public.approve_realtor(uuid) from public,anon;
grant execute on function public.approve_realtor(uuid) to authenticated;
create function public.public_media(asset_id uuid) returns table(object_key text,content_type text) language sql stable security definer set search_path='' as $$
 select object_key,content_type from public.media_assets where id=asset_id and approved;
$$;
revoke all on function public.public_media(uuid) from public;
grant execute on function public.public_media(uuid) to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('client-documents','client-documents',false,10485760,array['application/pdf']) on conflict(id) do nothing;
create policy private_document_read on storage.objects for select to authenticated using(bucket_id='client-documents' and (public.is_admin() or exists(select 1 from public.client_documents d where d.storage_path=name and d.user_id=auth.uid())));
create policy private_document_admin on storage.objects for all to authenticated using(bucket_id='client-documents' and public.is_admin()) with check(bucket_id='client-documents' and public.is_admin());



-- Source: 202610260002_server_submission.sql
-- Public and ordinary account keys cannot bypass the validated server submission route.

revoke all on function public.submit_enquiry(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.submit_enquiry(jsonb,uuid) to service_role;



-- Source: 202610260003_marketplace_requirements.sql
-- Additive update for the client-supplied marketplace specification. No real inventory is seeded.

alter table public.properties
 add column purpose text not null default 'For sale' check(purpose in ('For sale','For rent')),
 add column price_period text not null default 'Total' check(price_period in ('Total','Year','Month')),
 add column state text not null default '',add column lga text not null default '',
 add column city text not null default '',add column area text not null default '',
 add column furnishing text not null default 'Not specified' check(furnishing in ('Not specified','Unfurnished','Semi-furnished','Furnished')),
 add column featured boolean not null default false,
 add column review_status text not null default 'Pending' check(review_status in ('Pending','Approved','Rejected')),
 add column listed_at timestamptz not null default now(),add column archived_at timestamptz,
 add column gallery_urls text[] not null default '{}',add column video_url text not null default '',add column virtual_tour_url text not null default '',
 add column latitude numeric check(latitude between -90 and 90),add column longitude numeric check(longitude between -180 and 180);
update public.properties set review_status='Approved' where published;
alter table public.properties drop constraint properties_status_check;
alter table public.properties add constraint properties_status_check check(status in ('Available','Reserved','Sold','Rented'));
alter table public.properties add constraint properties_publish_review check(not published or (review_status='Approved' and archived_at is null));
alter table public.properties add constraint properties_price_period check((purpose='For sale' and price_period='Total') or (purpose='For rent' and price_period in ('Month','Year')));
alter table public.properties add constraint properties_status_purpose check((status<>'Rented' or purpose='For rent') and (status<>'Sold' or purpose='For sale'));
alter table public.properties add constraint properties_coordinates_pair check((latitude is null)=(longitude is null));
drop policy properties_public on public.properties;
create policy properties_public on public.properties for select to anon,authenticated using((published and review_status='Approved' and archived_at is null) or public.is_admin());
create index properties_location_hierarchy on public.properties(state,lga,city,area) where published and archived_at is null;
create index properties_purpose on public.properties(purpose,status,price) where published and archived_at is null;

create table public.saved_searches(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 100),filters jsonb not null check(jsonb_typeof(filters)='object' and length(filters::text)<=4000),created_at timestamptz not null default now()
);
alter table public.saved_searches enable row level security;
create policy searches_owner on public.saved_searches for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create index searches_owner_index on public.saved_searches(user_id,created_at desc);
grant select,insert,update,delete on public.saved_searches to authenticated;



-- Source: 202610260004_dashboard_notifications.sql
-- Dashboard notifications only. No email/SMS/WhatsApp delivery is implied.

create table public.notifications(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,message text not null,href text not null check(href like '/dashboard%' or href like '/properties/%'),
 read_at timestamptz,created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy notifications_owner_read on public.notifications for select to authenticated using(user_id=auth.uid());
create policy notifications_owner_update on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.notifications from anon,authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
create index notifications_owner_index on public.notifications(user_id,created_at desc);
create function public.notify_property_change() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.status is distinct from old.status or new.price is distinct from old.price or new.published is distinct from old.published then
  insert into public.notifications(user_id,title,message,href)
   select s.user_id,'A saved property has changed','Check the current listing for availability and price. An unpublished property may no longer be accessible.','/properties/'||new.slug
   from public.saved_properties s where s.property_id=new.id;
 end if;return new;
end;$$;
revoke all on function public.notify_property_change() from public,anon,authenticated;
create trigger notify_property_change after update on public.properties for each row execute function public.notify_property_change();
create function public.notify_enquiry_activity() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if tg_op='INSERT' then
  insert into public.notifications(user_id,title,message,href)
   select user_id,'New '||new.kind||' request','A new request is ready for authorised review.','/dashboard'
   from public.user_roles where role='admin';
 elsif new.status is distinct from old.status and new.user_id is not null then
  insert into public.notifications(user_id,title,message,href) values(new.user_id,'Request status updated','Your '||new.kind||' request is now '||new.status||'. Open your dashboard for details.',case when new.kind='inspection' then '/dashboard/inspections' else '/dashboard/support' end);
 end if;return new;
end;$$;
revoke all on function public.notify_enquiry_activity() from public,anon,authenticated;
create trigger notify_enquiry_activity after insert or update on public.enquiries for each row execute function public.notify_enquiry_activity();



-- Source: 202610260005_approved_people_content.sql
-- Approved testimonials and team profiles remain empty until MICMU supplies them.

alter table public.content drop constraint content_kind_check;
alter table public.content add constraint content_kind_check check(kind in ('article','estate','development','business','faq','testimonial','team'));



COMMIT;
