-- Dashboard notifications only. No email/SMS/WhatsApp delivery is implied.
begin;
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
commit;
