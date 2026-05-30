create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_letter text not null,
  active_language text not null default 'tr',
  title_tr text not null default 'Kişisel Bağlantılar',
  title_en text not null default 'Personal Links',
  title_de text not null default 'Persönliche Links',
  bio_tr text not null default '',
  bio_en text not null default '',
  bio_de text not null default '',
  dark_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null,
  label text not null,
  url text not null,
  icon text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.account_directory (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (
    id,
    username,
    display_name,
    avatar_letter,
    active_language,
    title_tr,
    title_en,
    title_de,
    bio_tr,
    bio_en,
    bio_de
  )
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 1)),
    'tr',
    'Kişisel Bağlantılar',
    'Personal Links',
    'Persönliche Links',
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || ' için hazırlanmış sade profil ve bağlantı alanı.',
    'A simple profile and link page is ready.',
    'Eine schlichte Profilseite ist bereit.'
  )
  on conflict (id) do nothing;

  insert into public.account_directory (
    id,
    email,
    role
  )
  values (
    new.id,
    new.email,
    case
      when not exists (
        select 1
        from public.account_directory
        where public.account_directory.role = 'admin'
      )
      then 'admin'
      when lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))) = 'admin'
      then 'admin'
      else 'member'
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.account_directory
    where public.account_directory.id = auth.uid()
      and public.account_directory.role = 'admin'
  );
$$;

create or replace function public.can_manage_blog_posts()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.account_directory
    where public.account_directory.id = auth.uid()
      and public.account_directory.role in ('admin', 'editor')
  );
$$;

create or replace function public.ensure_current_account_directory()
returns void
language plpgsql
security definer
as $$
begin
  insert into public.account_directory (id, email, role, created_at, updated_at)
  select
    u.id,
    u.email,
    coalesce(existing.role, 'member'),
    coalesce(existing.created_at, now()),
    now()
  from auth.users u
  left join public.account_directory existing on existing.id = u.id
  where u.id = auth.uid()
    and u.email is not null
  on conflict (id) do update
  set email = excluded.email,
      updated_at = now();
end;
$$;

create or replace function public.sync_account_directory()
returns integer
language plpgsql
security definer
as $$
declare
  inserted_count integer := 0;
begin
  if not public.is_admin_user() then
    raise exception 'Bu işlem için admin rolü gerekiyor.';
  end if;

  with inserted as (
    insert into public.account_directory (id, email, role, created_at, updated_at)
    select
      u.id,
      u.email,
      'member',
      coalesce(u.created_at, now()),
      now()
    from auth.users u
    left join public.account_directory directory on directory.id = u.id
    where directory.id is null
      and u.email is not null
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into inserted_count from inserted;

  return inserted_count;
end;
$$;

create or replace function public.protect_account_directory_role()
returns trigger
language plpgsql
security definer
as $$
begin
  if auth.uid() = old.id and old.role is distinct from new.role and not public.is_admin_user() then
    new.role := old.role;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

drop trigger if exists on_account_directory_before_update on public.account_directory;
create trigger on_account_directory_before_update
before update on public.account_directory
for each row execute procedure public.protect_account_directory_role();

alter table public.profiles enable row level security;
alter table public.profile_links enable row level security;
alter table public.account_directory enable row level security;

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  cover_image text not null default '',
  published_at timestamptz not null default now(),
  is_published boolean not null default true,
  author_username text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts enable row level security;

drop policy if exists "public profiles are viewable" on public.profiles;
create policy "public profiles are viewable"
on public.profiles for select
using (true);

drop policy if exists "public profile links are viewable" on public.profile_links;
create policy "public profile links are viewable"
on public.profile_links for select
using (true);

drop policy if exists "users manage own profile" on public.profiles;
create policy "users manage own profile"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "users manage own profile links" on public.profile_links;
create policy "users manage own profile links"
on public.profile_links for all
using (
  exists (
    select 1 from public.profiles
    where public.profiles.id = profile_links.profile_id
      and public.profiles.id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles
    where public.profiles.id = profile_links.profile_id
      and public.profiles.id = auth.uid()
  )
);

drop policy if exists "users view own account directory" on public.account_directory;
create policy "users view own account directory"
on public.account_directory for select
using (
  auth.uid() = id
  or public.is_admin_user()
);

drop policy if exists "users update own account directory" on public.account_directory;
create policy "users update own account directory"
on public.account_directory for update
using (
  auth.uid() = id
  or public.is_admin_user()
)
with check (
  auth.uid() = id
  or public.is_admin_user()
);

grant execute on function public.ensure_current_account_directory() to authenticated;
grant execute on function public.sync_account_directory() to authenticated;

drop policy if exists "public blog posts are viewable" on public.blog_posts;
create policy "public blog posts are viewable"
on public.blog_posts for select
using (
  is_published = true
  or public.can_manage_blog_posts()
);

drop policy if exists "admin manages blog posts" on public.blog_posts;
create policy "admin manages blog posts"
on public.blog_posts for all
using (public.can_manage_blog_posts())
with check (public.can_manage_blog_posts());
