begin;

-- Deliberately empty: the company must identify its owner before bootstrap.
-- A singleton designation cannot be changed through any application endpoint.
create table public.company_owner (
 singleton boolean primary key default true check (singleton),
 user_id uuid not null unique references auth.users(id) on delete restrict,
 created_at timestamptz not null default now()
);
alter table public.company_owner enable row level security;
revoke all on public.company_owner from public, anon, authenticated, service_role;
grant select on public.company_owner to authenticated;
create policy owner_self_read on public.company_owner for select to authenticated
 using (user_id = auth.uid() and coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'aal' = 'aal2');

create function public.is_company_owner() returns boolean
language sql stable security definer set search_path = '' as $$
 select coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'aal' = 'aal2'
 and exists (
   select 1 from public.company_owner o join auth.users u on u.id = o.user_id
   where o.user_id = auth.uid() and u.email_confirmed_at is not null
     and u.deleted_at is null and (u.banned_until is null or u.banned_until <= now())
 );
$$;
revoke all on function public.is_company_owner() from public, anon, service_role;
grant execute on function public.is_company_owner() to authenticated;

-- Extra detail complements the existing user_roles -> audit_logs trigger.
create table public.staff_access_events (
 id bigint generated always as identity primary key,
 actor_id uuid, target_id uuid not null,
 action text not null check (action in ('owner_designated','admin_granted','admin_revoked')),
 created_at timestamptz not null default now()
);
alter table public.staff_access_events enable row level security;
revoke all on public.staff_access_events from public, anon, authenticated, service_role;
grant select on public.staff_access_events to authenticated;
create policy staff_events_owner_read on public.staff_access_events for select to authenticated
 using (public.is_company_owner());

create function public.protect_company_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if tg_op <> 'INSERT' then
   raise exception 'The last company owner cannot be removed or replaced.' using errcode = '23514';
 end if;
 if not exists (select 1 from auth.users u where u.id = new.user_id
   and u.email_confirmed_at is not null and u.deleted_at is null
   and (u.banned_until is null or u.banned_until <= now())) then
   raise exception 'An existing confirmed account is required.' using errcode = '23514';
 end if;
 return new;
end;
$$;
create trigger protect_company_owner before insert or update or delete
 on public.company_owner for each row execute function public.protect_company_owner();
create trigger protect_company_owner_truncate before truncate
 on public.company_owner for each statement execute function public.protect_company_owner();

create function public.audit_owner_designation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.user_roles(user_id,role) values(new.user_id,'admin') on conflict do nothing;
 insert into public.staff_access_events(actor_id,target_id,action)
 values(auth.uid(),new.user_id,'owner_designated');
 insert into public.audit_logs(actor_id,action,table_name,record_id)
 values(auth.uid(),'INSERT','company_owner',new.user_id::text);
 return new;
end;
$$;
create trigger audit_owner_designation after insert on public.company_owner
 for each row execute function public.audit_owner_designation();

create function public.protect_owner_admin_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if old.role = 'admin' and exists(select 1 from public.company_owner where user_id = old.user_id) then
   raise exception 'The company owner must retain administrator access.' using errcode = '23514';
 end if;
 if tg_op = 'UPDATE' then return new; end if;
 return old;
end;
$$;
create trigger protect_owner_admin_role before delete or update on public.user_roles
 for each row execute function public.protect_owner_admin_role();
-- Prevent TRUNCATE from bypassing the row protection.
create function public.protect_owner_roles_truncate() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if exists(select 1 from public.company_owner) then
   raise exception 'The company owner must retain administrator access.' using errcode = '23514';
 end if;
 return null;
end;
$$;
create trigger protect_owner_roles_truncate before truncate on public.user_roles
 for each statement execute function public.protect_owner_roles_truncate();

-- No direct role writes, including with the server submission credential.
-- Existing realtor approvals continue through their security-definer functions.
revoke insert, update, delete, truncate, references, trigger on public.user_roles
 from public, anon, authenticated, service_role;

create function public.find_staff_account(p_email text)
returns table(user_id uuid,email text,full_name text,is_administrator boolean,is_owner boolean)
language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_company_owner() then
   raise exception 'MFA-verified company owner required.' using errcode = '42501';
 end if;
 if p_email is null or length(p_email) > 254 or length(btrim(p_email)) < 3 then
   raise exception 'Invalid email.' using errcode = '22023';
 end if;
 return query select u.id,u.email::text,coalesce(p.full_name,''),
   exists(select 1 from public.user_roles r where r.user_id=u.id and r.role='admin'),
   exists(select 1 from public.company_owner o where o.user_id=u.id)
 from auth.users u left join public.profiles p on p.id=u.id
 where lower(u.email)=lower(btrim(p_email)) and u.email_confirmed_at is not null
   and u.deleted_at is null and (u.banned_until is null or u.banned_until <= now());
end;
$$;

create function public.list_staff_access()
returns table(user_id uuid,email text,full_name text,is_administrator boolean,is_owner boolean)
language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_company_owner() then
   raise exception 'MFA-verified company owner required.' using errcode = '42501';
 end if;
 return query select u.id,u.email::text,coalesce(p.full_name,''),true,
   exists(select 1 from public.company_owner o where o.user_id=u.id)
 from public.user_roles r join auth.users u on u.id=r.user_id
 left join public.profiles p on p.id=u.id
 where r.role='admin' order by lower(u.email),u.id;
end;
$$;

create function public.set_staff_administrator(p_user uuid,p_grant boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
 if not public.is_company_owner() then
   raise exception 'MFA-verified company owner required.' using errcode = '42501';
 end if;
 -- Serialize role changes and recheck authorization inside the transaction.
 perform 1 from public.company_owner for update;
 if not public.is_company_owner() then
   raise exception 'MFA-verified company owner required.' using errcode = '42501';
 end if;
 if p_user is null or p_grant is null then
   raise exception 'Invalid request.' using errcode = '22023';
 end if;
 perform 1 from auth.users u where u.id=p_user and u.email_confirmed_at is not null
   and u.deleted_at is null and (u.banned_until is null or u.banned_until <= now()) for update;
 if not found then
   raise exception 'An existing confirmed account is required.' using errcode = '22023';
 end if;
 if not p_grant and exists(select 1 from public.company_owner where user_id=p_user) then
   raise exception 'The company owner must retain administrator access.' using errcode = '23514';
 end if;
 if p_grant then
   insert into public.user_roles(user_id,role) values(p_user,'admin') on conflict do nothing;
 else
   delete from public.user_roles where user_id=p_user and role='admin';
 end if;
 get diagnostics changed = row_count;
 if changed > 0 then
   insert into public.staff_access_events(actor_id,target_id,action)
   values(auth.uid(),p_user,case when p_grant then 'admin_granted' else 'admin_revoked' end);
 end if;
 return changed > 0;
end;
$$;

revoke all on function public.protect_company_owner(),public.audit_owner_designation(),
 public.protect_owner_admin_role(),public.protect_owner_roles_truncate() from public,anon,authenticated,service_role;
revoke all on function public.find_staff_account(text),public.list_staff_access(),
 public.set_staff_administrator(uuid,boolean) from public,anon,service_role;
grant execute on function public.find_staff_account(text),public.list_staff_access(),
 public.set_staff_administrator(uuid,boolean) to authenticated;
commit;
