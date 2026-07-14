-- ============================================================
-- PetDexter — revisit cooldown (server-side parity)
--
-- Bug fixed: capture_pet's revisit branch previously incremented
-- level/candy on EVERY matched scan with no rate limit, so a user could
-- farm unlimited free level-ups and candy by rescanning the same pet
-- back-to-back. Candy is now spendable (Boost Store treats aside, a
-- pet's own candy funds its Evolution — see client-side evolution.ts),
-- so this needed closing server-side too, not just in the client, since
-- a signed-in user could otherwise bypass the client-side cooldown by
-- clearing local storage and letting this RPC be the source of truth.
--
-- Mirrors the client's REVISIT_COOLDOWN_MS (4 hours): a revisit only
-- pays out (level+1, candy+3) once per pet per cooldown window. Scans
-- within the window still recognize the pet (no duplicate card, and a
-- new viewing angle may still be stored) but grant no reward.
-- ============================================================

alter table public.pet_cards
  add column if not exists last_revisit_at timestamptz not null default now();

create or replace function public.capture_pet(
  p_signature   vector(384),
  p_species     public.species_type,
  p_breed       text,
  p_custom_name text,
  p_image_url   text,
  p_lat         double precision default null,
  p_lng         double precision default null,
  p_venue_id    uuid default null,
  p_stats       jsonb default '{}'::jsonb,
  p_threshold   double precision default 0.80
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_match       record;
  v_card        public.pet_cards%rowtype;
  v_rival_card  public.pet_cards%rowtype;
  v_rarity      public.rarity_tier;
  v_battle      public.battles%rowtype;
  v_battle_json jsonb := null;
  v_view_count  int;
  v_cooldown    interval := interval '4 hours';
  v_elapsed     interval;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_match from public.match_pet_signature(p_signature, p_species, p_threshold);

  if v_match.card_id is not null then
    select * into v_card from public.pet_cards where id = v_match.card_id;
    v_elapsed := now() - v_card.last_revisit_at;

    -- always allowed to remember a new viewing angle, reward or not
    select count(*) into v_view_count from public.pet_signatures where card_id = v_card.id;
    if v_match.similarity < 0.93 and v_view_count < 3 then
      insert into public.pet_signatures (card_id, signature) values (v_card.id, p_signature);
    end if;

    if v_elapsed < v_cooldown then
      return jsonb_build_object(
        'outcome', 'revisit_cooldown',
        'card_id', v_card.id,
        'cooldown_remaining_ms', extract(epoch from (v_cooldown - v_elapsed)) * 1000
      );
    end if;

    update public.pet_cards
    set level = level + 1, candy = candy + 3, last_revisit_at = now()
    where id = v_match.card_id
    returning * into v_card;

    return jsonb_build_object(
      'outcome', 'revisit',
      'card_id', v_card.id,
      'level', v_card.level,
      'candy', v_card.candy,
      'similarity', v_match.similarity
    );
  end if;

  v_rarity := public.compute_rarity(p_breed);

  insert into public.pet_cards
    (owner_id, custom_name, species, breed, rarity, image_url,
     signature, lat, lng, venue_id, stats, last_revisit_at)
  values
    (auth.uid(), p_custom_name, p_species, p_breed, v_rarity, p_image_url,
     p_signature, p_lat, p_lng, p_venue_id, p_stats, now())
  returning * into v_card;

  -- ⚔️ Steal War check (species-gated like the local path)
  if p_venue_id is not null then
    select c.* into v_rival_card
    from public.pet_cards c
    where c.venue_id = p_venue_id
      and c.owner_id is not null and c.owner_id <> auth.uid()
      and c.species = p_species
      and c.signature is not null
      and 1 - (c.signature <=> p_signature) >= p_threshold
      and not exists (
        select 1 from public.battles b
        where b.status = 'awaiting_champions'
          and (b.challenger_card_id = c.id or b.defender_card_id = c.id)
      )
    order by c.signature <=> p_signature
    limit 1;

    if found then
      insert into public.battles
        (venue_id, challenger_id, defender_id, challenger_card_id, defender_card_id)
      values
        (p_venue_id, auth.uid(), v_rival_card.owner_id, v_card.id, v_rival_card.id)
      returning * into v_battle;

      v_battle_json := jsonb_build_object(
        'battle_id', v_battle.id,
        'defender_id', v_battle.defender_id,
        'status', v_battle.status
      );
    end if;
  end if;

  return jsonb_build_object(
    'outcome', 'new_discovery',
    'card_id', v_card.id,
    'serial_number', v_card.serial_number,
    'rarity', v_card.rarity,
    'battle', v_battle_json
  );
end;
$$;
