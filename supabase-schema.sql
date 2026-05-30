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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

alter table public.profiles enable row level security;
alter table public.profile_links enable row level security;

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

drop policy if exists "public blog posts are viewable" on public.blog_posts;
create policy "public blog posts are viewable"
on public.blog_posts for select
using (
  is_published = true
  or exists (
    select 1 from public.profiles
    where public.profiles.id = auth.uid()
      and public.profiles.username = 'admin'
  )
);

drop policy if exists "admin manages blog posts" on public.blog_posts;
create policy "admin manages blog posts"
on public.blog_posts for all
using (
  exists (
    select 1 from public.profiles
    where public.profiles.id = auth.uid()
      and public.profiles.username = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where public.profiles.id = auth.uid()
      and public.profiles.username = 'admin'
  )
);
