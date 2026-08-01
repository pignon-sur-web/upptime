-- 0006 — Réglages des widgets du tableau de bord.

-- Positions de dix en dix : réordonner n'oblige jamais à renuméroter la suite.
--
-- L'ordre reprend celui du cahier des charges. Un widget présent en base mais
-- absent du registre applicatif est ignoré, et un widget présent dans le
-- registre mais absent de la base est considéré actif : ajouter un widget dans
-- le code ne demande donc pas de migration.

create table if not exists public.widget_settings (
  id         uuid primary key default gen_random_uuid(),
  widget_key text not null unique,
  enabled    boolean not null default true,
  position   integer not null default 0
);

insert into public.widget_settings (widget_key, enabled, position) values
  ('le_jour',            true,  10),
  ('habitudes_du_jour',  true,  20),
  ('taches_du_jour',     true,  30),
  ('retards',            true,  40),
  ('sept_jours',         true,  50),
  ('comptes',            true,  60),
  ('mois_en_argent',     true,  70),
  ('paiements_a_venir',  true,  80),
  ('projets_en_cours',   true,  90),
  ('objectifs_en_cours', true, 100),
  ('mur_du_mois',        true, 110),
  ('courbe_habitudes',   true, 120),
  ('agenda',             true, 130),
  ('lecture_en_cours',   true, 140),
  ('inbox',              true, 150)
on conflict (widget_key) do nothing;

alter table public.widget_settings enable row level security;
