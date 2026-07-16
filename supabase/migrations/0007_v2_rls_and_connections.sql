-- ============================================================
-- PetDexter V2 — RLS for the Phase 1 identity schema + the
-- Pet Family QR connection RPC (spec §7, §15).
--
-- Run this AFTER 0006_v2_identity_schema.sql.
-- Safe to run more than once — every policy is dropped-then-recreated
-- and every function uses create or replace, so a partial or repeated
-- run never errors on "already exists."
--
-- Scope: this migration locks down every table created in 0006 with
-- row-level security. Only pet_profiles, pet_images, connections and
-- encounters get real policies right now, because those are the only
-- ones the client actually reads/writes for the QR connection feature.
-- Every other new table (places, events, quests, organizations,
-- adoption_pets, decks, deck_cards, inventory, campaign_items, reports,
-- provisional_pets, pet_relationships, quest_progress) is RLS-enabled
-- with NO policies, which means default-deny — safe to sit empty until
-- their features are actually built (Phase 2+).
-- ============================================================

alter table public.pet_profiles enable row level security;
alter table public.pet_images enable row level security;
alter table public.encounters enable row level security;
alter table public.provisional_pets enable row level security;
alter table public.connections enable row level security;
alter table public.pet_relationships enable row level security;
alter table public.places enable row level security;
alter table public.events enable row level security;
alter table public.quests enable row level security;
alter table public.quest_progress enable row level security;
alter table public.organizations enable row level security;
alter table public.adoption_pets enable row level security;
alter table public.decks enable row level security;
alter table public.deck_cards enable row level security;
alter table public.campaign_items enable row level security;
alter table public.inventory enable row level security;
alter table public.reports enable row level security;

-- ---- pet_profiles --------------------------------------------------

-- Visible to: the owner, anyone if public, or a connections_only pet
-- when the viewer has an accepted connection with the owner.
create or replace function public.can_view_pet_profile(p_owner_user_id uuid, p_visibility text)
returns boolean language sql stable security definer set search_path = public as $$
  select
    p_owner_user_id = auth.uid()
    or p_visibility = 'public'
    or (
      p_visibility = 'connections_only'
      and exists (
        select 1 from public.connections c
        where c.status = 'accepted'
          and (
            (c.user_a = auth.uid() and c.user_b = p_owner_user_id) or
            (c.user_b = auth.uid() and c.user_a = p_owner_user_id)
          )
      )
    );
$$;

drop policy if exists "pet_profiles readable per visibility" on public.pet_profiles;
create policy "pet_profiles readable per visibility"
  on public.pet_profiles for select
  using (public.can_view_pet_profile(owner_user_id, visibility));

drop policy if exists "pet_profiles owner writes" on public.pet_profiles;
create policy "pet_profiles owner writes"
  on public.pet_profiles for insert
  with check (owner_user_id = auth.uid());

drop policy if exists "pet_profiles owner updates" on public.pet_profiles;
create policy "pet_profiles owner updates"
  on public.pet_profiles for update
  using (owner_user_id = auth.uid());

drop policy if exists "pet_profiles owner deletes" on public.pet_profiles;
create policy "pet_profiles owner deletes"
  on public.pet_profiles for delete
  using (owner_user_id = auth.uid());

-- ---- pet_images ------------------------------------------------------

drop policy if exists "pet_images readable if parent pet readable" on public.pet_images;
create policy "pet_images readable if parent pet readable"
  on public.pet_images for select
  using (
    exists (
      select 1 from public.pet_profiles pp
      where pp.id = pet_images.pet_id
        and public.can_view_pet_profile(pp.owner_user_id, pp.visibility)
    )
  );

drop policy if exists "pet_images owner writes" on public.pet_images;
create policy "pet_images owner writes"
  on public.pet_images for insert
  with check (
    exists (select 1 from public.pet_profiles pp where pp.id = pet_id and pp.owner_user_id = auth.uid())
  );

drop policy if exists "pet_images owner deletes" on public.pet_images;
create policy "pet_images owner deletes"
  on public.pet_images for delete
  using (
    exists (select 1 from public.pet_profiles pp where pp.id = pet_id and pp.owner_user_id = auth.uid())
  );

-- ---- connections -------------------------------------------------------

drop policy if exists "connections readable by participants" on public.connections;
create policy "connections readable by participants"
  on public.connections for select
  using (user_a = auth.uid() or user_b = auth.uid());

drop policy if exists "connections insertable by participants" on public.connections;
create policy "connections insertable by participants"
  on public.connections for insert
  with check (user_a = auth.uid() or user_b = auth.uid());

-- ---- encounters (owner-only; not yet written by the client) ----------

drop policy if exists "encounters owner readable" on public.encounters;
create policy "encounters owner readable"
  on public.encounters for select
  using (user_id = auth.uid());

drop policy if exists "encounters owner writable" on public.encounters;
create policy "encounters owner writable"
  on public.encounters for insert
  with check (user_id = auth.uid());

-- ============================================================
-- Pet Family connection RPC
--
-- Scanning someone's QR calls this with their user id. It records (or
-- re-confirms) an accepted connection between the two accounts and
-- returns the scanned owner's display name plus every pet they've
-- marked shareable (visibility 'public' or 'connections_only' — the
-- latter works because the connection row is created in the SAME
-- transaction, before the pet_profiles select runs). Private pets are
-- never returned. Matches spec §7's "Scan a registered user or pet QR
-- → Free → Immediate verified connection or selected pet-family
-- exchange."
-- ============================================================

create or replace function public.request_pet_family_connection(p_owner_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_ua uuid;
  v_ub uuid;
  v_owner_name text;
  v_pets jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if auth.uid() = p_owner_id then
    raise exception 'Cannot connect to yourself';
  end if;
  if not exists (select 1 from public.profiles where id = p_owner_id) then
    raise exception 'No such pet parent';
  end if;

  -- canonical ordering so the unique(user_a, user_b) constraint holds
  -- regardless of who scanned whom
  if auth.uid() < p_owner_id then
    v_ua := auth.uid(); v_ub := p_owner_id;
  else
    v_ua := p_owner_id; v_ub := auth.uid();
  end if;

  insert into public.connections (user_a, user_b, source, status)
  values (v_ua, v_ub, 'qr', 'accepted')
  on conflict (user_a, user_b) do update set status = 'accepted';

  select username into v_owner_name from public.profiles where id = p_owner_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', pp.id,
    'name', pp.canonical_name,
    'species', pp.species,
    'breed', pp.breed,
    'traits', pp.traits,
    'image_url', (select pi.image_url from public.pet_images pi where pi.pet_id = pp.id order by pi.created_at limit 1)
  )), '[]'::jsonb)
  into v_pets
  from public.pet_profiles pp
  where pp.owner_user_id = p_owner_id
    and pp.status = 'owned'
    and pp.visibility in ('public', 'connections_only');

  return jsonb_build_object('owner_name', v_owner_name, 'pets', v_pets);
end;
$$;
