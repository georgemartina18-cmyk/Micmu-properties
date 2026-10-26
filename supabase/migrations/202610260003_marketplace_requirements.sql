-- Additive update for the client-supplied marketplace specification. No real inventory is seeded.
begin;
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
commit;
