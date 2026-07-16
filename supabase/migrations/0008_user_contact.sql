-- ============================================================
-- PetDexter — capture email/name for every sign-in, kept OUT of the
-- publicly-readable profiles table.
--
-- public.profiles has `for select using (true)` (migration 0001, needed
-- so leaderboards work for anonymous/other users) — so it must never hold
-- email or full name, or that data would be exposed through the public
-- Supabase API to anyone. This migration adds a separate table, locked to
-- owner-only reads, for exactly that sensitive data. You (the project
-- owner) can still see every row via the Supabase Studio Table Editor or
-- SQL Editor for exports/email campaigns — Studio runs with full database
-- access and bypasses RLS; the "owner only" policy below only restricts
-- what the app's normal anon/authenticated API key can read.
-- ============================================================

create table if not exists public.user_contact (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  updated_at timestamptz not null default now()
);

alter table public.user_contact enable row level security;

create policy "user_contact readable by owner only"
  on public.user_contact for select
  using (auth.uid() = id);

-- No insert/update policy for regular users — only the trigger below
-- (security definer) ever writes to this table.

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'username',
      'trainer_' || substr(new.id::text, 1, 8)
    )
  );

  insert into public.user_contact (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do update
    set email = excluded.email, full_name = excluded.full_name, updated_at = now();

  return new;
end;
$$;

-- Keep it fresh on every sign-in too (name/email can change at the
-- provider, or a user can add email sign-in after starting with Google).
create or replace function public.handle_user_updated()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_contact (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do update
    set email = excluded.email, full_name = excluded.full_name, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_updated();

-- Backfill everyone who signed up before this migration existed.
insert into public.user_contact (id, email, full_name)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')
from auth.users u
on conflict (id) do update
  set email = excluded.email, full_name = excluded.full_name, updated_at = now();
