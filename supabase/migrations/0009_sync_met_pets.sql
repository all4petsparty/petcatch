-- ============================================================
-- PetDexter — wire the live Meet! capture flow up to Supabase.
--
-- REQUIRES 0007 to have run successfully first — this migration calls
-- public.can_view_pet_profile(), which 0007 defines. If you see
-- "function public.can_view_pet_profile(uuid, text) does not exist",
-- run the (now idempotent, safe to re-run) 0007 again before this one.
--
-- Since the Phase 0 rewrite, capturing a pet in the app has been fully
-- local-only: nothing ever wrote to pet_cards, so map_discoveries and the
-- leaderboard_* views (built on pet_cards) have been silently stale for
-- every signed-in user since that rewrite shipped. This migration:
--   1. Adds lat/lng directly to encounters (no place-canonicalization
--      pipeline exists yet — Phase 3 work — so raw coordinates suffice).
--   2. Widens encounters SELECT so a publicly-visible pet's encounter
--      locations are readable by other users too (previously owner-only,
--      which would have hidden every OTHER user's pin from the map even
--      though their pet_profiles rows are public) — same pattern already
--      used for pet_images in migration 0007.
--   3. Rebuilds map_discoveries and the three leaderboard_* views to read
--      from pet_profiles + encounters instead of the dead pet_cards path,
--      keeping the exact column names/shapes the client already queries
--      so no client-side query changes are needed.
--
-- "My Pets" (status='owned') are deliberately excluded from both — these
-- views are about real-world discovery, not pets you already own.
-- ============================================================

alter table public.encounters
  add column if not exists lat double precision,
  add column if not exists lng double precision;

drop policy if exists "encounters readable if parent pet readable" on public.encounters;
create policy "encounters readable if parent pet readable"
  on public.encounters for select
  using (
    pet_id is not null and exists (
      select 1 from public.pet_profiles pp
      where pp.id = encounters.pet_id
        and public.can_view_pet_profile(pp.owner_user_id, pp.visibility)
    )
  );

drop view if exists public.map_discoveries;
create view public.map_discoveries
with (security_invoker = on) as
select pp.id, pp.species, pp.breed, pp.canonical_name as custom_name,
       first_enc.lat, first_enc.lng, pp.created_at
from public.pet_profiles pp
join lateral (
  select e.lat, e.lng
  from public.encounters e
  where e.pet_id = pp.id and e.lat is not null and e.lng is not null
  order by e.occurred_at asc
  limit 1
) first_enc on true
where pp.status = 'unclaimed';

drop view if exists public.leaderboard_global;
create view public.leaderboard_global
with (security_invoker = on) as
select p.id, p.username, p.avatar_url, p.region, count(pp.id) as unique_pets
from public.profiles p
join public.pet_profiles pp on pp.owner_user_id = p.id and pp.status = 'unclaimed'
group by p.id
order by unique_pets desc;

drop view if exists public.leaderboard_species;
create view public.leaderboard_species
with (security_invoker = on) as
select pp.species, p.id, p.username, p.avatar_url, count(pp.id) as catches
from public.pet_profiles pp
join public.profiles p on p.id = pp.owner_user_id
where pp.status = 'unclaimed'
group by pp.species, p.id
order by pp.species, catches desc;

drop view if exists public.leaderboard_breed;
create view public.leaderboard_breed
with (security_invoker = on) as
select pp.breed, p.id, p.username, p.avatar_url, count(distinct pp.id) as documented
from public.pet_profiles pp
join public.profiles p on p.id = pp.owner_user_id
where pp.status = 'unclaimed' and pp.breed is not null
group by pp.breed, p.id
order by pp.breed, documented desc;
