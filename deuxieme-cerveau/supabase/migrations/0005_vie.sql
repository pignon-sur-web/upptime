-- 0005 — Clients, agenda, journal, sport, lectures, cours, notes, inbox.

create table if not exists public.clients (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null check (length(btrim(name)) > 0),
  status                text not null default 'piste'
                        check (status in ('piste', 'actif', 'pause', 'gagne', 'perdu')),
  last_contact          date,
  next_followup         date,
  email                 text,
  phone                 text,
  estimated_value_cents integer,
  notes                 text,
  created_at            timestamptz not null default now()
);

create index if not exists clients_relance_idx
  on public.clients(next_followup)
  where next_followup is not null and status in ('piste', 'actif');

-- projects.client_id existait déjà en 0003 sans contrainte : clients n'était
-- pas encore créée. On la referme ici.
alter table public.projects drop constraint if exists projects_client_fk;
alter table public.projects
  add constraint projects_client_fk
  foreign key (client_id) references public.clients(id) on delete set null;

-- L'agenda est le seul endroit qui manipule des instants plutôt que des jours,
-- d'où timestamptz. Partout ailleurs, une date de calendrier est un `date`.
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (length(btrim(title)) > 0),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  all_day    boolean not null default false,
  category   text check (category is null or category in ('pro', 'perso', 'sport')),
  location   text,
  created_at timestamptz not null default now(),

  constraint events_ordre_coherent check (ends_at >= starts_at)
);

create index if not exists events_debut_idx on public.events(starts_at);

create table if not exists public.journal_entries (
  id              uuid primary key default gen_random_uuid(),
  date            date not null unique default public.app_today(),
  mood            smallint check (mood between 1 and 5),
  done_text       text,
  carry_over_text text,
  free_note       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists journal_toucher on public.journal_entries;
create trigger journal_toucher before update on public.journal_entries
  for each row execute function public.tg_toucher_updated_at();

-- muscle_groups en text[] plutôt qu'en table de liaison : on ne fera jamais de
-- requête relationnelle là-dessus, et l'index GIN suffit pour le filtrage.
create table if not exists public.workouts (
  id            uuid primary key default gen_random_uuid(),
  date          date not null default public.app_today(),
  type          text not null,
  muscle_groups text[] not null default '{}',
  duration_min  smallint check (duration_min between 1 and 600),
  feeling       smallint check (feeling between 1 and 5),
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists workouts_date_idx on public.workouts(date desc);

create table if not exists public.books (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(btrim(title)) > 0),
  author      text,
  category    text,
  status      text not null default 'a_lire'
              check (status in ('a_lire', 'en_cours', 'lu', 'abandonne')),
  cover_path  text,                    -- chemin dans le bucket Storage
  rating      smallint check (rating between 1 and 5),
  started_on  date,
  finished_on date,
  created_at  timestamptz not null default now()
);

create table if not exists public.courses (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(btrim(name)) > 0),
  subject      text,
  status       text not null default 'prevu'
               check (status in ('prevu', 'en_cours', 'termine', 'abandonne')),
  resource_url text,
  progress     smallint not null default 0 check (progress between 0 and 100),
  created_at   timestamptz not null default now()
);

-- Les tags restent HORS du vecteur de recherche : array_to_string() est
-- seulement STABLE et ne peut pas figurer dans une colonne générée. Ils ont
-- leur propre index GIN, et la recherche par tag se combine côté application.
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default '',
  content    text not null default '',
  tags       text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  search_vector tsvector generated always as (
       setweight(to_tsvector('public.fr_unaccent', coalesce(title, '')),   'A')
    || setweight(to_tsvector('public.fr_unaccent', coalesce(content, '')), 'B')
  ) stored
);

create index if not exists notes_recherche_idx on public.notes using gin(search_vector);
create index if not exists notes_tags_idx       on public.notes using gin(tags);

drop trigger if exists notes_toucher on public.notes;
create trigger notes_toucher before update on public.notes
  for each row execute function public.tg_toucher_updated_at();

create table if not exists public.inbox_items (
  id           uuid primary key default gen_random_uuid(),
  content      text not null check (length(btrim(content)) > 0),
  guessed_type text check (guessed_type in ('tache', 'note', 'depense', 'evenement')),
  processed_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists inbox_ouverts_idx
  on public.inbox_items(created_at desc) where processed_at is null;

alter table public.clients         enable row level security;
alter table public.events          enable row level security;
alter table public.journal_entries enable row level security;
alter table public.workouts        enable row level security;
alter table public.books           enable row level security;
alter table public.courses         enable row level security;
alter table public.notes           enable row level security;
alter table public.inbox_items     enable row level security;
