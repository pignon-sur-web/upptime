-- 0001 — Socle : fuseau horaire, recherche plein texte française, utilitaires.
--
-- À exécuter dans l'éditeur SQL de Supabase, dans l'ordre des numéros.

-- —————————————————————————————————————————————————————————————————
-- Le fuseau, seule source de vérité pour « aujourd'hui »
--
-- Supabase tourne en UTC. Entre minuit et 2h du matin, heure belge, UTC est
-- encore la veille : une habitude cochée à 00h30 tomberait sur le mauvais jour
-- et la série casserait au réveil.
--
-- Règle : `current_date` est banni dans tout le reste du schéma, on passe
-- toujours par app_today(). Côté application, le pendant est aujourdhui()
-- dans src/lib/date.ts.
-- —————————————————————————————————————————————————————————————————

create or replace function public.app_today() returns date
language sql stable parallel safe as $$
  select (now() at time zone 'Europe/Brussels')::date;
$$;

-- —————————————————————————————————————————————————————————————————
-- Recherche plein texte, insensible aux accents
--
-- Chercher « resume » doit trouver « résumé ».
--
-- Cette configuration existe pour une raison précise : la forme à deux
-- arguments to_tsvector(regconfig, text) est IMMUTABLE, ce qui est la
-- condition pour l'employer dans une colonne générée. La forme à un argument
-- est seulement STABLE (elle dépend de default_text_search_config) et Postgres
-- la refuse. unaccent() seul est également refusé.
-- —————————————————————————————————————————————————————————————————

-- Supabase place les extensions dans le schéma `extensions`, qui existe déjà
-- chez eux ; la création conditionnelle rend la migration rejouable sur un
-- Postgres nu, ce qui permet de la tester ailleurs que en production.
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

do $$
begin
  if not exists (
    select 1 from pg_ts_config where cfgname = 'fr_unaccent'
  ) then
    create text search configuration public.fr_unaccent (copy = french);
    -- Dictionnaire qualifié par son schéma : la résolution par search_path
    -- serait fragile, et Supabase modifie le search_path.
    alter text search configuration public.fr_unaccent
      alter mapping for hword, hword_part, word
      with extensions.unaccent, french_stem;
  end if;
end $$;

-- —————————————————————————————————————————————————————————————————
-- Utilitaires
-- —————————————————————————————————————————————————————————————————

create or replace function public.tg_toucher_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
