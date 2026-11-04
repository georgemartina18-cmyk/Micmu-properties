-- Apply 202611040001_delegated_staff_access.sql first.
-- The company has explicitly approved delegation to this developer account.
-- This is privileged, audited database setup; it does NOT designate another owner.
DO $delegate$
declare
 owner_id constant uuid := '06adaa1b-c7e5-41c1-81b9-f1c67c61e76f';
 developer_id constant uuid := 'fee91401-0009-4972-945a-db11a3b36d3b';
begin
 perform 1 from public.company_owner o join auth.users u on u.id=o.user_id
 where o.user_id=owner_id and lower(u.email)='micmupropertiesltd@gmail.com'
   and u.email_confirmed_at is not null and u.deleted_at is null
   and (u.banned_until is null or u.banned_until<=now()) for update of o;
 if not found then raise exception 'The expected company owner was not verified. No changes made.'; end if;
 perform 1 from auth.users u join public.user_roles r on r.user_id=u.id and r.role='admin'
 where u.id=developer_id and lower(u.email)='georgemartina18@gmail.com'
   and u.email_confirmed_at is not null and u.deleted_at is null
   and (u.banned_until is null or u.banned_until<=now()) for update of u;
 if not found then raise exception 'The confirmed developer administrator was not verified. No changes made.'; end if;
 -- NULL means database setup. Do not impersonate the owner's signed-in session.
 insert into public.staff_access_managers(user_id,created_by) values(developer_id,null)
 on conflict(user_id) do nothing;
 if not exists(select 1 from public.company_owner where user_id=owner_id)
   or not exists(select 1 from public.user_roles where user_id=owner_id and role='admin') then
   raise exception 'Owner preservation verification failed. Rolling back.';
 end if;
end;
$delegate$;

select u.email,exists(select 1 from public.staff_access_managers m where m.user_id=u.id) as staff_access_manager,
 exists(select 1 from public.company_owner o where o.user_id=u.id) as company_owner
from auth.users u where u.id in ('06adaa1b-c7e5-41c1-81b9-f1c67c61e76f','fee91401-0009-4972-945a-db11a3b36d3b')
order by u.email;
