-- 0002 — Habitudes.

-- —————————————————————————————————————————————————————————————————
-- Pourquoi started_on / archived_on plutôt qu'un booléen `active`
--
-- Avec un booléen, archiver une habitude en mars ferait passer rétroactivement
-- toutes les journées de janvier de 100 % à 66 % : le dénominateur du score
-- serait « les habitudes actives maintenant » au lieu de « les habitudes qui
-- existaient ce jour-là ».
--
-- Avec une fenêtre de dates, rien de ce qu'on fait aujourd'hui ne change le
-- score d'hier. C'est la seule propriété qui rend l'historique digne de
-- confiance, et un booléen ne peut pas la rattraper après coup sans inventer
-- ces dates de toute façon.
--
-- days_of_week existe pour la même raison : sans lui, une habitude qui ne
-- concerne que la semaine casserait la série chaque samedi, ou fausserait le
-- dénominateur du week-end. Par défaut tous les jours, donc gratuit pour les
-- habitudes quotidiennes.
-- —————————————————————————————————————————————————————————————————

create table if not exists public.habits (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(btrim(name)) between 1 and 80),
  emoji        text check (length(emoji) <= 8),
  position     integer not null default 0,
  started_on   date not null default public.app_today(),
  archived_on  date,                       -- borne haute exclusive
  days_of_week smallint[] not null default '{1,2,3,4,5,6,7}',  -- ISO : 1 = lundi
  created_at   timestamptz not null default now(),

  constraint habits_fenetre_coherente
    check (archived_on is null or archived_on > started_on),
  constraint habits_jours_valides check (
    array_length(days_of_week, 1) between 1 and 7
    and days_of_week <@ '{1,2,3,4,5,6,7}'::smallint[]
  )
);

-- `done` est conservé plutôt qu'une sémantique « la ligne existe = c'est
-- fait » : le cochage devient un upsert idempotent, un seul chemin de code
-- sans branche de suppression.
create table if not exists public.habit_logs (
  id       uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  date     date not null,
  done     boolean not null default true,

  unique (habit_id, date)
);

create index if not exists habit_logs_date_idx on public.habit_logs(date);

alter table public.habits     enable row level security;
alter table public.habit_logs enable row level security;
