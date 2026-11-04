begin;

-- Permission membership is separate from both user_roles and public team content.
-- No accounts are appointed by this migration.
create table public.staff_access_managers (
 user_id uuid primary key references auth.users(id) on delete restrict,
 created_by uuid,
 created_at timestamptz not null default now()
);
alter table public.staff_access_managers enable row level security;
revoke all on public.staff_access_managers from public,anon,authenticated,service_role;
grant select on public.staff_access_managers to authenticated;

-- VOLATILE is intentional: rechecks after the owner-row lock must see a
-- delegation revocation committed while this statement was waiting for the lock.
create function public.can_manage_staff_access() returns boolean
language sql volatile security definer set search_path='' as $$
 select coalesce(public.is_company_owner(),false) or (
   coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'aal' is not distinct from 'aal2'
   and exists (
     select 1 from public.staff_access_managers m
     join auth.users u on u.id=m.user_id
     join public.user_roles r on r.user_id=u.id and r.role='admin'
     where m.user_id=auth.uid() and u.email_confirmed_at is not null
       and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
   )
 );
$$;
revoke all on function public.can_manage_staff_access() from public,anon,service_role;
grant execute on function public.can_manage_staff_access() to authenticated;
create policy access_managers_read on public.staff_access_managers for select to authenticated
 using(public.can_manage_staff_access());
drop policy staff_events_owner_read on public.staff_access_events;
create policy staff_events_managers_read on public.staff_access_events for select to authenticated
 using(public.can_manage_staff_access());
alter table public.staff_access_events drop constraint staff_access_events_action_check;
alter table public.staff_access_events add constraint staff_access_events_action_check
 check(action in ('owner_designated','admin_granted','admin_revoked','manager_granted','manager_revoked'));

create function public.validate_staff_access_manager() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='TRUNCATE' or tg_op='UPDATE' then
   raise exception 'Use audited grant/revoke operations for staff access managers.' using errcode='23514';
 end if;
 if not exists(select 1 from public.company_owner) then
   raise exception 'Designate the company owner first.' using errcode='23514';
 end if;
 if exists(select 1 from public.company_owner where user_id=new.user_id) then
   raise exception 'The company owner already has protected staff access.' using errcode='23514';
 end if;
 if not exists(select 1 from auth.users u join public.user_roles r on r.user_id=u.id and r.role='admin'
   where u.id=new.user_id and u.email_confirmed_at is not null and u.deleted_at is null
     and (u.banned_until is null or u.banned_until<=now())) then
   raise exception 'An existing confirmed active administrator is required.' using errcode='23514';
 end if;
 return new;
end;
$$;
create trigger validate_staff_access_manager before insert or update on public.staff_access_managers
 for each row execute function public.validate_staff_access_manager();
create trigger protect_staff_access_managers_truncate before truncate on public.staff_access_managers
 for each statement execute function public.validate_staff_access_manager();

create function public.audit_staff_access_manager() returns trigger
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if tg_op='DELETE' then target:=old.user_id; else target:=new.user_id; end if;
 insert into public.staff_access_events(actor_id,target_id,action)
 values(auth.uid(),target,case when tg_op='INSERT' then 'manager_granted' else 'manager_revoked' end);
 insert into public.audit_logs(actor_id,action,table_name,record_id)
 values(auth.uid(),tg_op,'staff_access_managers',target::text);
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;
create trigger audit_staff_access_manager after insert or delete on public.staff_access_managers
 for each row execute function public.audit_staff_access_manager();

create function public.protect_manager_admin_role() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.role='admin' and exists(select 1 from public.staff_access_managers where user_id=old.user_id) then
   raise exception 'The owner must revoke delegated staff access before administrator access.' using errcode='23514';
 end if;
 if tg_op='UPDATE' then return new; end if;
 return old;
end;
$$;
create trigger protect_manager_admin_role before delete or update on public.user_roles
 for each row execute function public.protect_manager_admin_role();

create function public.set_staff_access_manager(p_user uuid,p_grant boolean) returns boolean
language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
 if public.is_company_owner() is distinct from true then
   raise exception 'MFA-verified company owner required.' using errcode='42501';
 end if;
 perform 1 from public.company_owner for update;
 if public.is_company_owner() is distinct from true then
   raise exception 'MFA-verified company owner required.' using errcode='42501';
 end if;
 if p_user is null or p_grant is null then raise exception 'Invalid request.' using errcode='22023'; end if;
 if exists(select 1 from public.company_owner where user_id=p_user) then
   raise exception 'The company owner has protected staff access.' using errcode='23514';
 end if;
 -- Revocation remains possible for a disabled delegate; granting requires active admin status.
 perform 1 from auth.users u where u.id=p_user and (not p_grant or (
   u.email_confirmed_at is not null and u.deleted_at is null
   and (u.banned_until is null or u.banned_until<=now())
   and exists(select 1 from public.user_roles r where r.user_id=u.id and r.role='admin')
 )) for update;
 if not found then raise exception 'An existing confirmed active administrator is required.' using errcode='22023'; end if;
 if p_grant then
   insert into public.staff_access_managers(user_id,created_by) values(p_user,auth.uid()) on conflict do nothing;
 else
   delete from public.staff_access_managers where user_id=p_user;
 end if;
 get diagnostics changed=row_count;
 return changed>0;
end;
$$;
revoke all on function public.set_staff_access_manager(uuid,boolean) from public,anon,service_role;
grant execute on function public.set_staff_access_manager(uuid,boolean) to authenticated;

-- Preserve existing RPC return types and permissions for rollout compatibility.
create or replace function public.find_staff_account(p_email text)
returns table(user_id uuid,email text,full_name text,is_administrator boolean,is_owner boolean)
language plpgsql security definer set search_path='' as $$
begin
 if public.can_manage_staff_access() is distinct from true then
   raise exception 'MFA-verified company owner or delegated staff access manager required.' using errcode='42501';
 end if;
 if p_email is null or length(p_email)>254 or length(btrim(p_email))<3 then raise exception 'Invalid email.' using errcode='22023'; end if;
 return query select u.id,u.email::text,coalesce(p.full_name,''),
   exists(select 1 from public.user_roles r where r.user_id=u.id and r.role='admin'),
   exists(select 1 from public.company_owner o where o.user_id=u.id)
 from auth.users u left join public.profiles p on p.id=u.id
 where lower(u.email)=lower(btrim(p_email)) and u.email_confirmed_at is not null
   and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now());
end;
$$;
create or replace function public.list_staff_access()
returns table(user_id uuid,email text,full_name text,is_administrator boolean,is_owner boolean)
language plpgsql security definer set search_path='' as $$
begin
 if public.can_manage_staff_access() is distinct from true then
   raise exception 'MFA-verified company owner or delegated staff access manager required.' using errcode='42501';
 end if;
 return query select u.id,u.email::text,coalesce(p.full_name,''),true,
   exists(select 1 from public.company_owner o where o.user_id=u.id)
 from public.user_roles r join auth.users u on u.id=r.user_id
 left join public.profiles p on p.id=u.id where r.role='admin' order by lower(u.email),u.id;
end;
$$;
create or replace function public.set_staff_administrator(p_user uuid,p_grant boolean) returns boolean
language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
 if public.can_manage_staff_access() is distinct from true then
   raise exception 'MFA-verified company owner or delegated staff access manager required.' using errcode='42501';
 end if;
 perform 1 from public.company_owner for update;
 if public.can_manage_staff_access() is distinct from true then
   raise exception 'MFA-verified company owner or delegated staff access manager required.' using errcode='42501';
 end if;
 if p_user is null or p_grant is null then raise exception 'Invalid request.' using errcode='22023'; end if;
 if exists(select 1 from public.company_owner where user_id=p_user) then
   raise exception 'The company owner must retain administrator access.' using errcode='23514';
 end if;
 if exists(select 1 from public.staff_access_managers where user_id=p_user) then
   raise exception 'The owner must revoke delegated staff access before administrator access.' using errcode='23514';
 end if;
 perform 1 from auth.users u where u.id=p_user and u.email_confirmed_at is not null
   and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()) for update;
 if not found then raise exception 'An existing confirmed account is required.' using errcode='22023'; end if;
 if p_grant then
   insert into public.user_roles(user_id,role) values(p_user,'admin') on conflict do nothing;
 else
   delete from public.user_roles where user_id=p_user and role='admin';
 end if;
 get diagnostics changed=row_count;
 if changed>0 then
   insert into public.staff_access_events(actor_id,target_id,action)
   values(auth.uid(),p_user,case when p_grant then 'admin_granted' else 'admin_revoked' end);
 end if;
 return changed>0;
end;
$$;
revoke all on function public.validate_staff_access_manager(),public.audit_staff_access_manager(),
 public.protect_manager_admin_role() from public,anon,authenticated,service_role;
commit;
