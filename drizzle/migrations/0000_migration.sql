create type public.app_role as enum ('owner','admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('owner','admin'))
$$;

create policy "Users see own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'owner'));

create or replace function public.assign_first_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'owner') then
    insert into public.user_roles (user_id, role) values (new.id, 'owner');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created_owner after insert on auth.users
  for each row execute function public.assign_first_owner();

create or replace function public.grant_admin_by_email(_email text)
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.has_role(auth.uid(),'owner') then raise exception 'Only owner'; end if;
  select id into uid from auth.users where lower(email) = lower(_email);
  if uid is null then return false; end if;
  insert into public.user_roles (user_id, role) values (uid,'admin') on conflict do nothing;
  return true;
end; $$;
revoke execute on function public.grant_admin_by_email(text) from anon, public;
grant execute on function public.grant_admin_by_email(text) to authenticated;

create table public.app_settings (
  id int primary key default 1 check (id = 1),
  app_name text not null default 'Vibe Call',
  tagline text not null default 'Free HD video calls with friends & family',
  apk_url text,
  version text not null default '1.0.0',
  min_android text not null default 'Android 7.0+',
  updated_at timestamptz not null default now()
);
grant select on public.app_settings to anon, authenticated;
grant update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "Anyone reads settings" on public.app_settings for select to anon, authenticated using (true);
create policy "Staff update settings" on public.app_settings for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
insert into public.app_settings (id) values (1);

create policy "Staff read apks" on storage.objects for select to authenticated using (bucket_id = 'apks' and public.is_staff(auth.uid()));
create policy "Staff upload apks" on storage.objects for insert to authenticated with check (bucket_id = 'apks' and public.is_staff(auth.uid()));
create policy "Staff update apks" on storage.objects for update to authenticated using (bucket_id = 'apks' and public.is_staff(auth.uid()));
create policy "Staff delete apks" on storage.objects for delete to authenticated using (bucket_id = 'apks' and public.is_staff(auth.uid()));