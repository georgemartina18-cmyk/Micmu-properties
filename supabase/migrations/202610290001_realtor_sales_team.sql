begin;
alter table public.content add column if not exists image_url text not null default '';
alter table public.content add column if not exists sort_order integer not null default 0;
create table public.realtor_members (
 user_id uuid primary key references auth.users(id), full_name text not null check(length(full_name) between 2 and 180),
 email text not null, phone text not null check(length(phone) between 7 and 24), experience_years numeric(4,1) not null check(experience_years between 0 and 80),
 previous_sales integer not null check(previous_sales between 0 and 1000000),
 referral_code text not null unique default upper(replace(gen_random_uuid()::text,'-','')),
 referred_by uuid references public.realtor_members(user_id), status text not null default 'pending' check(status in ('pending','approved','rejected','suspended')),
 created_at timestamptz not null default now(), check(referred_by is distinct from user_id)
);
create table public.realtor_sales (
 id uuid primary key default gen_random_uuid(), reference text not null unique check(length(reference) between 2 and 80),
 property_id uuid not null references public.properties(id), seller_id uuid not null references public.realtor_members(user_id),
 base_price numeric(16,2) not null check(base_price>0), plan_months integer not null check(plan_months in (0,3,6,12)),
 full_price numeric(16,2) not null check(full_price>0), discounted boolean not null default false,
 commission_agreement text not null default '', status text not null default 'pending' check(status in ('pending','confirmed','cancelled')),
 created_at timestamptz not null default now(), confirmed_at timestamptz
);
create table public.sale_commissions (
 id uuid not null unique default gen_random_uuid(), sale_id uuid not null references public.realtor_sales(id), realtor_id uuid not null references public.realtor_members(user_id),
 sale_reference text not null, generation integer not null check(generation between 0 and 2), rate numeric(5,2) not null check(rate between 0 and 100),
 amount numeric(16,2) not null check(amount>=0), status text not null default 'pending' check(status in ('pending','approved','paid','cancelled')),
 primary key(sale_id,generation)
);
create table public.sale_instalments (
 id uuid primary key default gen_random_uuid(), sale_id uuid not null references public.realtor_sales(id), sequence integer not null,
 due_date date not null, percentage numeric(5,2) not null, amount numeric(16,2) not null check(amount>0), unique(sale_id,sequence)
);
create table public.sale_receipts (
 id uuid primary key default gen_random_uuid(), sale_id uuid not null references public.realtor_sales(id),
 reference text not null unique check(length(reference) between 2 and 100), amount numeric(16,2) not null check(amount>0),
 received_on date not null, created_at timestamptz not null default now()
);

alter table public.realtor_members enable row level security;
alter table public.realtor_sales enable row level security;
alter table public.sale_commissions enable row level security;
alter table public.sale_instalments enable row level security;
alter table public.sale_receipts enable row level security;
create policy members_read on public.realtor_members for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy sales_read on public.realtor_sales for select to authenticated using(seller_id=auth.uid() or public.is_admin());
create policy commissions_read on public.sale_commissions for select to authenticated using(realtor_id=auth.uid() or public.is_admin());
create policy instalments_admin on public.sale_instalments for select to authenticated using(public.is_admin());
create policy receipts_admin on public.sale_receipts for select to authenticated using(public.is_admin());
-- All writes use the narrow functions below. No direct financial writes by clients.
grant select on public.realtor_members,public.realtor_sales,public.sale_commissions,public.sale_instalments,public.sale_receipts to authenticated;

-- Downline projection exposes names and status, not applications or phone numbers.
create function public.my_direct_downlines() returns table(user_id uuid,full_name text,status text,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 select m.user_id,m.full_name,m.status,m.created_at from public.realtor_members m
 where m.referred_by=auth.uid() and exists(select 1 from public.realtor_members me where me.user_id=auth.uid() and me.status='approved');
$$;
revoke all on function public.my_direct_downlines() from public;
grant execute on function public.my_direct_downlines() to authenticated;

create function public.apply_realtor(p_name text,p_phone text,p_years numeric,p_sales integer,p_code text default '') returns void
language plpgsql security definer set search_path='' as $$
declare sponsor uuid;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Confirmed account required'; end if;
 if exists(select 1 from public.realtor_members where user_id=auth.uid()) then raise exception 'Application already submitted. Contact MICMU for changes.'; end if;
 if trim(p_code)<>'' then
 select user_id into sponsor from public.realtor_members where referral_code=upper(trim(p_code)) and status='approved';
 if sponsor is null or sponsor=auth.uid() then raise exception 'Invalid referral code'; end if;
 end if;
 insert into public.realtor_members(user_id,full_name,email,phone,experience_years,previous_sales,referred_by)
 values(auth.uid(),trim(p_name),(select email from auth.users where id=auth.uid()),trim(p_phone),p_years,p_sales,sponsor);
end; $$;

create function public.review_realtor(p_user uuid,p_status text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Verified administrator required'; end if;
 if p_status not in ('approved','rejected','suspended') then raise exception 'Invalid status'; end if;
 update public.realtor_members set status=p_status where user_id=p_user;
 if not found then raise exception 'Application not found'; end if;
 if p_status='approved' then insert into public.user_roles(user_id,role) values(p_user,'realtor') on conflict do nothing;
 else delete from public.user_roles where user_id=p_user and role='realtor'; end if;
end; $$;

create function public.create_realtor_sale(p_reference text,p_property uuid,p_seller uuid,p_base numeric,p_plan integer,p_discounted boolean,p_full numeric,p_agreement text,p_start date) returns uuid
language plpgsql security definer set search_path='' as $$
declare sid uuid; total numeric; parts integer[]; months integer[]; i integer; assigned numeric:=0; part numeric;
begin
 if not public.is_admin() then raise exception 'Verified administrator required'; end if;
 if not exists(select 1 from public.realtor_members where user_id=p_seller and status='approved') then raise exception 'Approved selling realtor required'; end if;
 if not exists(select 1 from public.properties where id=p_property and purpose='For sale' and archived_at is null) then raise exception 'Active sale property required'; end if;
 if p_base<=0 or p_base>1000000000000 or p_plan not in (0,3,6,12) or p_start is null then raise exception 'Invalid sale terms'; end if;
 total:=round(p_base * case p_plan when 6 then 1.05 when 12 then 1.10 else 1 end,2);
 if p_discounted then
 if p_full<=0 or p_full>total or length(trim(p_agreement))<10 then raise exception 'Discounted price and written agreement required'; end if;
 total:=round(p_full,2);
 end if;
 insert into public.realtor_sales(reference,property_id,seller_id,base_price,plan_months,full_price,discounted,commission_agreement)
 values(trim(p_reference),p_property,p_seller,p_base,p_plan,total,p_discounted,coalesce(p_agreement,'')) returning id into sid;
 if p_plan=3 then parts:=array[50,30,20];months:=array[0,2,3];
 elsif p_plan=6 then parts:=array[40,20,20,20];months:=array[0,2,3,6];
 elsif p_plan=12 then parts:=array[30,10,10,15,15,15,5];months:=array[0,2,4,6,8,10,12];
 else parts:=array[100];months:=array[0];end if;
 for i in 1..array_length(parts,1) loop
 part:=case when i=array_length(parts,1) then total-assigned else round(total*parts[i]/100,2) end;
 insert into public.sale_instalments(sale_id,sequence,due_date,percentage,amount) values(sid,i,(p_start+make_interval(months=>months[i]))::date,parts[i],part);
 assigned:=assigned+part;
 end loop;
 return sid;
end; $$;

create function public.confirm_realtor_sale(p_sale uuid,p_custom jsonb default '[]') returns void
language plpgsql security definer set search_path='' as $$
declare s public.realtor_sales; recipient uuid; pct numeric; i integer; rates numeric[]:=array[10,3,2];
begin
 if not public.is_admin() then raise exception 'Verified administrator required'; end if;
 select * into s from public.realtor_sales where id=p_sale for update;
 if s.id is null or s.status<>'pending' then raise exception 'Pending sale required; sale already processed or missing'; end if;
 if not exists(select 1 from public.realtor_members where user_id=s.seller_id and status='approved') then raise exception 'Selling realtor must remain approved'; end if;
 if s.discounted and (jsonb_typeof(p_custom)<>'array' or jsonb_array_length(p_custom)<>3) then raise exception 'Three agreed rates required for discounted sale'; end if;
 if s.discounted then
 rates:=array[(p_custom->>0)::numeric,(p_custom->>1)::numeric,(p_custom->>2)::numeric];
 if rates[1] is null or rates[2] is null or rates[3] is null or rates[1]<0 or rates[2]<0 or rates[3]<0 or rates[1]+rates[2]+rates[3]>100 then raise exception 'Invalid agreed rates'; end if;
 end if;
 recipient:=s.seller_id;
 for i in 1..3 loop
 exit when recipient is null;
 if exists(select 1 from public.realtor_members where user_id=recipient and status='approved') then
 pct:=rates[i];
 insert into public.sale_commissions(sale_id,realtor_id,sale_reference,generation,rate,amount) values(s.id,recipient,s.reference,i-1,pct,round(s.full_price*pct/100,2));
 end if;
 select referred_by into recipient from public.realtor_members where user_id=recipient;
 end loop;
 update public.realtor_sales set status='confirmed',confirmed_at=now() where id=s.id;
end; $$;

create function public.record_sale_receipt(p_sale uuid,p_reference text,p_amount numeric,p_date date) returns void
language plpgsql security definer set search_path='' as $$
declare s public.realtor_sales; received numeric;
begin
 if not public.is_admin() then raise exception 'Verified administrator required'; end if;
 select * into s from public.realtor_sales where id=p_sale for update;
 if s.id is null or s.status<>'confirmed' then raise exception 'Confirmed sale required'; end if;
 select coalesce(sum(amount),0) into received from public.sale_receipts where sale_id=p_sale;
 if p_amount<=0 or round(p_amount,2)<>p_amount or received+p_amount>s.full_price or p_date>current_date then raise exception 'Invalid payment amount or date'; end if;
 insert into public.sale_receipts(sale_id,reference,amount,received_on) values(p_sale,trim(p_reference),p_amount,p_date);
end; $$;

create function public.set_sale_commission_status(p_sale uuid,p_generation integer,p_status text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Verified administrator required'; end if;
 if p_status not in ('approved','paid','cancelled') then raise exception 'Invalid status'; end if;
 perform 1 from public.realtor_sales where id=p_sale and status='confirmed' for update;
 if not found then raise exception 'Confirmed sale required'; end if;
 update public.sale_commissions set status=p_status where sale_id=p_sale and generation=p_generation and
 ((status='pending' and p_status in ('approved','cancelled')) or (status='approved' and p_status in ('paid','cancelled')));
 if not found then raise exception 'Invalid commission transition'; end if;
end; $$;

-- Correct draft due dates before confirming the signed payment agreement.
create function public.set_instalment_date(p_id uuid,p_date date) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Verified administrator required'; end if;
 if p_date is null then raise exception 'Due date required'; end if;
 perform 1 from public.realtor_sales s join public.sale_instalments i on i.sale_id=s.id where i.id=p_id and s.status='pending' for update of s;
 if not found then raise exception 'Pending sale required'; end if;
 update public.sale_instalments set due_date=p_date where id=p_id;
end; $$;
revoke all on function public.set_instalment_date(uuid,date) from public;
grant execute on function public.set_instalment_date(uuid,date) to authenticated;

create function public.cancel_realtor_sale(p_sale uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Verified administrator required'; end if;
 perform 1 from public.realtor_sales where id=p_sale and status in ('pending','confirmed') for update;
 if not found then raise exception 'Sale missing or cancelled'; end if;
 if exists(select 1 from public.sale_receipts where sale_id=p_sale) or exists(select 1 from public.sale_commissions where sale_id=p_sale and status='paid') then raise exception 'Payments exist. Resolve refunds outside this workflow before cancellation.'; end if;
 update public.sale_commissions set status='cancelled' where sale_id=p_sale;
 update public.realtor_sales set status='cancelled' where id=p_sale;
end; $$;
revoke all on function public.cancel_realtor_sale(uuid) from public;
grant execute on function public.cancel_realtor_sale(uuid) to authenticated;

-- Audit writes, including financial events. Never expose the audit log to realtors.
do $$ declare t text; begin
 foreach t in array array['realtor_members','realtor_sales','sale_commissions','sale_instalments','sale_receipts'] loop
 execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.audit_change()',t);
 end loop;
end $$;
revoke all on function public.apply_realtor(text,text,numeric,integer,text),public.review_realtor(uuid,text),public.create_realtor_sale(text,uuid,uuid,numeric,integer,boolean,numeric,text,date),public.confirm_realtor_sale(uuid,jsonb),public.record_sale_receipt(uuid,text,numeric,date),public.set_sale_commission_status(uuid,integer,text) from public;
grant execute on function public.apply_realtor(text,text,numeric,integer,text),public.review_realtor(uuid,text),public.create_realtor_sale(text,uuid,uuid,numeric,integer,boolean,numeric,text,date),public.confirm_realtor_sale(uuid,jsonb),public.record_sale_receipt(uuid,text,numeric,date),public.set_sale_commission_status(uuid,integer,text) to authenticated;
commit;
