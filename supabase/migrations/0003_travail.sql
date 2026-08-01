-- 0003 — Projets, tâches, objectifs, résultats clés.

-- Les énumérations sont en text + CHECK plutôt qu'en type ENUM : un ENUM
-- Postgres ne se renomme ni ne se supprime sans échanger tout le type, et
-- ALTER TYPE ... ADD VALUE ne peut pas être suivi d'un usage dans la même
-- transaction. Avec text + CHECK, faire évoluer une valeur tient en une ligne
-- réversible.
--
-- Exception : les priorités sont des smallint, pour que `order by priority`
-- fonctionne. C'est la seule chose que le texte fait perdre.
--   0 = aucune · 1 = urgent et important · 2 = important · 3 = secondaire

create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) > 0),
  status     text not null default 'active'
             check (status in ('idee', 'active', 'pause', 'termine', 'abandonne')),
  priority   smallint check (priority between 0 and 3),
  start_date date,
  due_date   date,
  client_id  uuid,          -- clé étrangère ajoutée en 0005, clients arrive après
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) > 0),
  category   text,
  status     text not null default 'active'
             check (status in ('active', 'pause', 'termine', 'abandonne')),
  priority   smallint check (priority between 0 and 3),
  start_date date,
  due_date   date,
  created_at timestamptz not null default now()
);

create table if not exists public.key_results (
  id            uuid primary key default gen_random_uuid(),
  goal_id       uuid not null references public.goals(id) on delete cascade,
  name          text not null,
  unit          text,                       -- 'kg', '€', 'pages', ou rien
  start_value   numeric(14,4) not null default 0,
  current_value numeric(14,4) not null default 0,
  target_value  numeric(14,4) not null,
  position      integer not null default 0
);

create index if not exists key_results_goal_idx on public.key_results(goal_id);

-- —————————————————————————————————————————————————————————————————
-- Tâches
--
-- La récurrence est stockée en durée ISO-8601 ('P1D', 'P2W', 'P1M') : la
-- chaîne se convertit directement en interval Postgres, et TypeScript voit une
-- union propre au lieu de la sérialisation d'interval de PostgREST ('1 mon').
--
-- Trois colonnes servent la génération d'occurrences, détaillée dans 0008 :
--   recurrence_anchor  'schedule'   la date est fixée de l'extérieur (loyer)
--                      'completion' le compteur repart quand on le fait
--   series_id          identité de la suite d'occurrences
--   series_origin_date point de départ, pour calculer sans dérive
-- —————————————————————————————————————————————————————————————————

create table if not exists public.tasks (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null check (length(btrim(title)) > 0),
  priority           smallint check (priority between 0 and 3),
  status             text not null default 'a_faire'
                     check (status in ('a_faire', 'en_cours', 'fait', 'annule')),
  due_date           date,
  context            text check (context is null or context in ('pro', 'perso')),
  note               text,

  project_id         uuid references public.projects(id)    on delete set null,
  parent_task_id     uuid references public.tasks(id)       on delete cascade,
  key_result_id      uuid references public.key_results(id) on delete set null,

  recurrence         text check (recurrence ~ '^P[0-9]+[DWMY]$'),
  recurrence_anchor  text not null default 'schedule'
                     check (recurrence_anchor in ('schedule', 'completion')),
  series_id          uuid not null default gen_random_uuid(),
  series_origin_date date,
  occurrence_index   integer not null default 0,

  -- Permet d'annuler un import CSV entier d'une seule opération.
  import_batch_id    uuid,

  done_at            timestamptz,
  created_at         timestamptz not null default now(),

  constraint tasks_done_at_coherent
    check ((status = 'fait') = (done_at is not null)),
  constraint tasks_recurrence_exige_echeance
    check (recurrence is null or due_date is not null),
  constraint tasks_pas_son_propre_parent
    check (parent_task_id is distinct from id)
);

-- Invariant de série : au plus UNE occurrence ouverte par série. C'est ce qui
-- rend la double tape structurellement incapable de créer deux occurrences
-- suivantes. Les tâches ordinaires reçoivent chacune un series_id unique, donc
-- l'index ne se déclenche jamais pour elles — l'invariant est gratuit.
create unique index if not exists tasks_une_ouverte_par_serie
  on public.tasks(series_id)
  where status in ('a_faire', 'en_cours');

create index if not exists tasks_ouvertes_echeance_idx
  on public.tasks(due_date)
  where status in ('a_faire', 'en_cours');

create index if not exists tasks_projet_idx
  on public.tasks(project_id)
  where project_id is not null;

create index if not exists tasks_lot_import_idx
  on public.tasks(import_batch_id)
  where import_batch_id is not null;

-- Une tâche récurrente créée sans origine explicite prend son échéance comme
-- point de départ de la série.
create or replace function public.tg_tasks_defauts() returns trigger
language plpgsql as $$
begin
  if new.series_origin_date is null then
    new.series_origin_date := new.due_date;
  end if;
  return new;
end $$;

drop trigger if exists tasks_defauts on public.tasks;
create trigger tasks_defauts before insert on public.tasks
  for each row execute function public.tg_tasks_defauts();

-- Journal des imports CSV, pour pouvoir défaire un lot.
create table if not exists public.import_batches (
  id         uuid primary key default gen_random_uuid(),
  source     text,                      -- nom du fichier déposé
  row_count  integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.projects       enable row level security;
alter table public.goals          enable row level security;
alter table public.key_results    enable row level security;
alter table public.tasks          enable row level security;
alter table public.import_batches enable row level security;
