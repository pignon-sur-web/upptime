-- 0004 — Comptes, transactions, paiements à venir, budgets.

-- —————————————————————————————————————————————————————————————————
-- L'argent est stocké en centimes entiers
--
-- Ce n'est pas une préférence, c'est une question de justesse : PostgREST
-- sérialise `numeric` en NOMBRE JSON, donc 19,99 ferait un aller-retour par un
-- flottant JavaScript. On finirait par écrire Math.round(x * 100) partout par
-- prudence.
--
-- Règle : toute colonne suffixée _cents est un entier, et rien d'autre dans
-- l'application n'est de l'argent. Le formatage se fait au bord, avec
-- Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).
-- —————————————————————————————————————————————————————————————————

create table if not exists public.accounts (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null check (length(btrim(name)) > 0),
  type                  text not null default 'courant'
                        check (type in ('courant', 'epargne', 'especes', 'carte', 'investissement')),
  opening_balance_cents integer not null default 0,
  currency              char(3) not null default 'EUR',
  position              integer not null default 0,
  archived              boolean not null default false,
  created_at            timestamptz not null default now()
);

-- `kind` porte à lui seul ce que le cahier des charges séparait en `kind` et
-- `is_adjustment` : deux colonnes pour une seule information, dont on pouvait
-- écrire des combinaisons incohérentes.
--
-- amount_cents est SIGNÉ : négatif quand l'argent quitte le compte. Ça rend le
-- solde calculable par une simple somme, sans jamais avoir à interpréter le
-- type de l'écriture.
create table if not exists public.transactions (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references public.accounts(id) on delete cascade,
  date              date not null default public.app_today(),
  label             text not null check (length(btrim(label)) > 0),
  amount_cents      integer not null,
  kind              text not null
                    check (kind in ('revenu', 'depense', 'virement', 'ajustement')),
  category          text,
  note              text,
  transfer_group_id uuid,
  created_at        timestamptz not null default now(),

  constraint tx_signe_coherent check (
    (kind = 'revenu'  and amount_cents > 0) or
    (kind = 'depense' and amount_cents < 0) or
    (kind in ('virement', 'ajustement'))
  ),
  constraint tx_non_nulle check (amount_cents <> 0),
  constraint tx_virement_groupe check (
    (kind = 'virement') = (transfer_group_id is not null)
  )
);

create index if not exists tx_compte_date_idx on public.transactions(account_id, date desc);
create index if not exists tx_date_idx        on public.transactions(date desc);
create index if not exists tx_groupe_idx      on public.transactions(transfer_group_id)
  where transfer_group_id is not null;

-- paid_transaction_id relie une échéance payée à l'écriture réelle. Sans ce
-- lien, « payé » serait un booléen flottant à côté de l'argent, et les soldes
-- dériveraient en silence.
create table if not exists public.upcoming_payments (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (length(btrim(name)) > 0),
  due_date            date not null,
  amount_cents        integer not null check (amount_cents > 0),
  category            text,
  account_id          uuid references public.accounts(id) on delete set null,
  recurrence          text check (recurrence ~ '^P[0-9]+[DWMY]$'),
  series_id           uuid not null default gen_random_uuid(),
  series_origin_date  date,
  occurrence_index    integer not null default 0,
  paid_at             timestamptz,
  paid_transaction_id uuid references public.transactions(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists echeances_ouvertes_idx
  on public.upcoming_payments(due_date) where paid_at is null;

create unique index if not exists echeances_une_ouverte_par_serie
  on public.upcoming_payments(series_id) where paid_at is null;

-- `month` à NULL = plafond par défaut valable tous les mois ; sinon plafond
-- d'un mois précis. Ça donne « 80 €/mois de courses, sauf en décembre où c'est
-- 200 € » sans seconde table.
create table if not exists public.budgets (
  id                uuid primary key default gen_random_uuid(),
  category          text not null,
  monthly_cap_cents integer not null check (monthly_cap_cents > 0),
  month             date,

  constraint budgets_mois_est_un_premier
    check (month is null or extract(day from month) = 1)
);

create unique index if not exists budgets_defaut_uniq
  on public.budgets(category) where month is null;
create unique index if not exists budgets_mois_uniq
  on public.budgets(category, month) where month is not null;

alter table public.accounts          enable row level security;
alter table public.transactions      enable row level security;
alter table public.upcoming_payments enable row level security;
alter table public.budgets           enable row level security;
