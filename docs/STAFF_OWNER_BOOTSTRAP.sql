-- Run only AFTER the company identifies its owner and migration
-- 202610310001_staff_access.sql has been applied.
-- Replace the placeholder with the explicitly identified login email.
-- Never infer an owner from team profiles, existing admins or previous test users.
DO $bootstrap$
declare
 owner_email text := 'REPLACE_WITH_CONFIRMED_COMPANY_OWNER_EMAIL';
 owner_id uuid;
 existing_owner uuid;
begin
 lock table public.company_owner in share row exclusive mode;
 if owner_email = 'REPLACE_WITH_CONFIRMED_COMPANY_OWNER_EMAIL' then
   raise exception 'Identify the company owner before assigning privileges.';
 end if;
 select u.id into strict owner_id from auth.users u
 where lower(u.email) = lower(btrim(owner_email))
   and u.email_confirmed_at is not null and u.deleted_at is null
   and (u.banned_until is null or u.banned_until <= now());
 select user_id into existing_owner from public.company_owner;
 if existing_owner is not null then
   if existing_owner <> owner_id then
     raise exception 'A different company owner is already designated. No changes made.';
   end if;
   raise notice 'This account is already the company owner. No changes made.';
   return;
 end if;
 -- The designation trigger grants admin and logs both changes atomically.
 insert into public.company_owner(user_id) values(owner_id);
 raise notice 'Company owner designated: %. Verify MFA before using Staff access.', owner_id;
end;
$bootstrap$;
