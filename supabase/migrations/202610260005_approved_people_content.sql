-- Approved testimonials and team profiles remain empty until MICMU supplies them.
begin;
alter table public.content drop constraint content_kind_check;
alter table public.content add constraint content_kind_check check(kind in ('article','estate','development','business','faq','testimonial','team'));
commit;
