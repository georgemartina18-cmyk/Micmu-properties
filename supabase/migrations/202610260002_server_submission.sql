-- Public and ordinary account keys cannot bypass the validated server submission route.
begin;
revoke all on function public.submit_enquiry(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.submit_enquiry(jsonb,uuid) to service_role;
commit;
