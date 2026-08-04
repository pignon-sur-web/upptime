-- 0008 — Fonctions : séries, complétion de tâches, virements, rapprochement.
--
-- Toutes ces fonctions sont SECURITY INVOKER (le défaut). Surtout pas
-- SECURITY DEFINER : ça percerait directement le mur RLS au profit d'anon.
-- La migration 0009 leur retire de toute façon le droit d'exécution pour
-- anon et authenticated — seule la clé service_role les appelle.

-- —————————————————————————————————————————————————————————————————
-- Séries d'habitudes
--
-- Deux règles portent tout le reste.
--
-- 1. Seuls les jours PROGRAMMÉS comptent. Une habitude du lundi au vendredi ne
--    doit pas voir sa série cassée chaque samedi.
--
-- 2. Aujourd'hui n'est pas une preuve d'échec tant que la journée n'est pas
--    finie. Une série qui se remet à zéro à minuit est un défaut, pas un choix
--    de conception : la rupture se constate le lendemain. Concrètement, le jour
--    courant non coché est retiré de l'examen au lieu d'être compté comme raté.
-- —————————————————————————————————————————————————————————————————

create or replace function public.serie_habitude(p_habit_id uuid)
returns integer
language sql stable as $$
  with h as (
    select * from public.habits where id = p_habit_id
  ),
  programmes as (
    select d::date as date
    from h,
         generate_series(
           h.started_on,
           least(coalesce(h.archived_on - 1, public.app_today()), public.app_today()),
           interval '1 day') d
    where extract(isodow from d)::smallint = any(h.days_of_week)
  ),
  examines as (
    select p.date,
           coalesce(l.done, false) as fait,
           row_number() over (order by p.date desc) as rang
    from programmes p
    left join public.habit_logs l
           on l.habit_id = p_habit_id and l.date = p.date
    where not (p.date = public.app_today() and coalesce(l.done, false) = false)
  )
  -- En parcourant du plus récent au plus ancien, la série est le rang du
  -- premier jour manqué, moins un. Si rien n'a été manqué, c'est tout
  -- l'historique.
  select coalesce(
    (select min(rang) - 1 from examines where not fait),
    (select count(*)      from examines)
  )::int;
$$;

-- Série globale : « au moins une habitude cochée dans la journée ».
-- Les jours sans rien de programmé sont ignorés, pas comptés comme des échecs :
-- une semaine de vacances ne doit pas anéantir deux cents jours de suite.
create or replace function public.serie_globale()
returns integer
language sql stable as $$
  with examines as (
    select date,
           (coalesce(score, 0) > 0) as ok,
           row_number() over (order by date desc) as rang
    from public.score_habitude_jour
    where attendues > 0
      and not (date = public.app_today() and coalesce(score, 0) = 0)
  )
  select coalesce(
    (select min(rang) - 1 from examines where not ok),
    (select count(*)      from examines)
  )::int;
$$;

-- —————————————————————————————————————————————————————————————————
-- Complétion d'une tâche, et génération de l'occurrence suivante
--
-- Le modèle est « on génère à la complétion » : pas de cron, pas d'arriéré qui
-- gonfle. Trois défauts guettaient, tous traités ici.
--
-- 1. La dérive du rattrapage. Une tâche quotidienne oubliée huit jours, si on
--    ajoutait bêtement un jour à l'ancienne échéance, régénérerait une
--    occurrence déjà en retard : il faudrait huit validations pour rattraper.
--    On avance donc en boucle jusqu'à dépasser aujourd'hui — un seul saut.
--
-- 2. La dérive de fin de mois. '2026-01-31'::date + interval '1 month' vaut le
--    28 février (Postgres borne), puis 28 février + 1 mois vaut le 28 mars : le
--    loyer aurait déménagé du 31 au 28, définitivement. On calcule donc chaque
--    échéance depuis l'origine de la série, jamais par additions successives :
--    31 janvier + 2 mois = 31 mars, exact.
--
-- 3. La double tape sur un réseau lent. Le verrou de ligne, le retour immédiat
--    si la tâche est déjà faite, et l'index unique « une seule occurrence
--    ouverte par série » rendent le doublon structurellement impossible.
-- —————————————————————————————————————————————————————————————————

create or replace function public.completer_tache(p_task_id uuid)
returns uuid
language plpgsql as $$
declare
  t          public.tasks%rowtype;
  v_suivante date;
  v_n        integer;
  v_nouvelle uuid;
  v_garde    integer := 0;
begin
  select * into t from public.tasks where id = p_task_id for update;
  if not found then
    raise exception 'tâche % introuvable', p_task_id using errcode = 'no_data_found';
  end if;

  -- Idempotent : la seconde tape ne fait rien.
  if t.status = 'fait' then
    return null;
  end if;

  update public.tasks
     set status = 'fait', done_at = now()
   where id = p_task_id;

  if t.recurrence is null then
    return null;
  end if;

  if t.recurrence_anchor = 'completion' then
    -- Le compteur repart du jour où on l'a réellement faite.
    v_n := t.occurrence_index + 1;
    v_suivante := (public.app_today() + t.recurrence::interval)::date;
  else
    -- La date est fixée de l'extérieur : on cherche la prochaine occurrence
    -- réellement à venir, mesurée depuis l'origine de la série.
    v_n := t.occurrence_index;
    loop
      v_n := v_n + 1;
      v_suivante := (coalesce(t.series_origin_date, t.due_date)
                     + (v_n * t.recurrence::interval))::date;
      exit when v_suivante > public.app_today();

      v_garde := v_garde + 1;
      if v_garde > 5000 then
        raise exception 'récurrence dégénérée sur la série %', t.series_id;
      end if;
    end loop;
  end if;

  insert into public.tasks
    (title, priority, status, due_date, context, note, project_id, parent_task_id,
     key_result_id, recurrence, recurrence_anchor,
     series_id, series_origin_date, occurrence_index)
  values
    (t.title, t.priority, 'a_faire', v_suivante, t.context, t.note, t.project_id,
     t.parent_task_id, t.key_result_id, t.recurrence, t.recurrence_anchor,
     t.series_id, coalesce(t.series_origin_date, t.due_date), v_n)
  returning id into v_nouvelle;

  return v_nouvelle;
end $$;

-- Passer son tour : l'occurrence courante est annulée, la suivante est créée.
-- Sans ça, « sauté » serait indiscernable de « en retard ».
create or replace function public.passer_tache(p_task_id uuid)
returns uuid
language plpgsql as $$
declare
  t          public.tasks%rowtype;
  v_suivante date;
  v_n        integer;
  v_nouvelle uuid;
  v_garde    integer := 0;
begin
  select * into t from public.tasks where id = p_task_id for update;
  if not found then
    raise exception 'tâche % introuvable', p_task_id using errcode = 'no_data_found';
  end if;
  if t.status in ('fait', 'annule') then
    return null;
  end if;

  update public.tasks set status = 'annule' where id = p_task_id;

  if t.recurrence is null then
    return null;
  end if;

  v_n := t.occurrence_index;
  loop
    v_n := v_n + 1;
    v_suivante := (coalesce(t.series_origin_date, t.due_date)
                   + (v_n * t.recurrence::interval))::date;
    exit when v_suivante > public.app_today();
    v_garde := v_garde + 1;
    if v_garde > 5000 then
      raise exception 'récurrence dégénérée sur la série %', t.series_id;
    end if;
  end loop;

  insert into public.tasks
    (title, priority, status, due_date, context, note, project_id, parent_task_id,
     key_result_id, recurrence, recurrence_anchor,
     series_id, series_origin_date, occurrence_index)
  values
    (t.title, t.priority, 'a_faire', v_suivante, t.context, t.note, t.project_id,
     t.parent_task_id, t.key_result_id, t.recurrence, t.recurrence_anchor,
     t.series_id, coalesce(t.series_origin_date, t.due_date), v_n)
  returning id into v_nouvelle;

  return v_nouvelle;
end $$;

-- —————————————————————————————————————————————————————————————————
-- Virement entre comptes
--
-- En SQL, et pas deux insertions dans une action serveur : deux insertions
-- peuvent réussir à moitié. L'argent quitterait le compte A sans apparaître
-- nulle part, le solde serait faux en silence, et la découverte se ferait trois
-- semaines plus tard sans savoir quelle ligne est orpheline. C'est exactement
-- la classe de défaut que cette application existe pour empêcher.
-- —————————————————————————————————————————————————————————————————

create or replace function public.enregistrer_virement(
  p_compte_source      uuid,
  p_compte_destination uuid,
  p_montant_cents      bigint,
  p_date               date default null,
  p_libelle            text default 'Virement',
  p_note               text default null
) returns uuid
language plpgsql as $$
declare
  v_groupe uuid := gen_random_uuid();
  v_date   date := coalesce(p_date, public.app_today());
  v_source public.accounts%rowtype;
  v_dest   public.accounts%rowtype;
begin
  if p_compte_source = p_compte_destination then
    raise exception 'les comptes source et destination doivent différer'
      using errcode = 'check_violation';
  end if;
  if p_montant_cents is null or p_montant_cents <= 0 then
    raise exception 'le montant doit être strictement positif'
      using errcode = 'check_violation';
  end if;

  select * into v_source from public.accounts where id = p_compte_source;
  if not found then raise exception 'compte source introuvable'; end if;
  select * into v_dest   from public.accounts where id = p_compte_destination;
  if not found then raise exception 'compte destination introuvable'; end if;

  if v_source.currency <> v_dest.currency then
    raise exception 'virement multi-devises non pris en charge (% → %)',
      v_source.currency, v_dest.currency using errcode = 'feature_not_supported';
  end if;

  insert into public.transactions
    (account_id, date, label, amount_cents, kind, category, note, transfer_group_id)
  values
    (p_compte_source,      v_date, p_libelle, -p_montant_cents, 'virement', 'virement', p_note, v_groupe),
    (p_compte_destination, v_date, p_libelle,  p_montant_cents, 'virement', 'virement', p_note, v_groupe);

  return v_groupe;
end $$;

-- Supprimer un virement, c'est supprimer ses deux jambes. L'interface n'offre
-- pas de suppression individuelle sur une ligne portant un transfer_group_id.
create or replace function public.supprimer_virement(p_groupe uuid)
returns integer
language sql as $$
  with supprimees as (
    delete from public.transactions where transfer_group_id = p_groupe returning 1
  )
  select count(*)::int from supprimees;
$$;

-- —————————————————————————————————————————————————————————————————
-- Rapprochement de solde
--
-- On saisit le solde réel lu sur l'application bancaire ; la fonction crée
-- l'écriture d'écart. Jamais de correction silencieuse.
--
-- En SQL plutôt que dans l'action serveur pour que le solde calculé et l'écart
-- inséré viennent du MÊME instantané : l'application ne peut alors jamais être
-- en désaccord avec le grand livre sur ce que « calculé » voulait dire.
--
-- Le rapprochement s'arrête à la date de l'ajustement, pas à maintenant :
-- sinon un loyer post-daté se retrouverait plié dans l'écart du jour.
-- —————————————————————————————————————————————————————————————————

create or replace function public.enregistrer_ajustement(
  p_compte_id   uuid,
  p_solde_reel_cents bigint,
  p_date        date default null,
  p_note        text default null
) returns table (
  transaction_id uuid,
  calcule_cents  bigint,
  ecart_cents    bigint
)
language plpgsql as $$
declare
  v_ouverture bigint;
  v_somme     bigint;
  v_calcule   bigint;
  v_ecart     bigint;
  v_id        uuid;
  v_date      date := coalesce(p_date, public.app_today());
begin
  select c.opening_balance_cents into v_ouverture
  from public.accounts c where c.id = p_compte_id;
  if not found then
    raise exception 'compte % introuvable', p_compte_id using errcode = 'no_data_found';
  end if;

  select coalesce(sum(t.amount_cents), 0) into v_somme
  from public.transactions t
  where t.account_id = p_compte_id and t.date <= v_date;

  v_calcule := v_ouverture + v_somme;
  v_ecart   := p_solde_reel_cents - v_calcule;

  -- Écart nul : rien à créer. Une écriture à zéro serait de toute façon
  -- refusée par la contrainte tx_non_nulle.
  if v_ecart <> 0 then
    insert into public.transactions
      (account_id, date, label, amount_cents, kind, category, note)
    values
      (p_compte_id, v_date, 'Ajustement de solde', v_ecart, 'ajustement', 'ajustement', p_note)
    returning id into v_id;
  end if;

  return query select v_id, v_calcule, v_ecart;
end $$;

-- —————————————————————————————————————————————————————————————————
-- Marquer une échéance payée : ça DOIT créer l'écriture correspondante,
-- sinon « payé » serait un booléen flottant à côté de l'argent réel.
-- —————————————————————————————————————————————————————————————————

create or replace function public.payer_echeance(
  p_echeance_id uuid,
  p_compte_id   uuid default null,
  p_date        date default null
) returns uuid
language plpgsql as $$
declare
  e          public.upcoming_payments%rowtype;
  v_compte   uuid;
  v_date     date := coalesce(p_date, public.app_today());
  v_tx       uuid;
  v_suivante date;
  v_n        integer;
  v_garde    integer := 0;
begin
  select * into e from public.upcoming_payments where id = p_echeance_id for update;
  if not found then
    raise exception 'échéance % introuvable', p_echeance_id using errcode = 'no_data_found';
  end if;
  if e.paid_at is not null then
    return e.paid_transaction_id;      -- idempotent
  end if;

  v_compte := coalesce(p_compte_id, e.account_id);
  if v_compte is null then
    raise exception 'aucun compte indiqué pour l''échéance %', p_echeance_id
      using errcode = 'check_violation';
  end if;

  insert into public.transactions
    (account_id, date, label, amount_cents, kind, category)
  values
    (v_compte, v_date, e.name, -e.amount_cents, 'depense', e.category)
  returning id into v_tx;

  update public.upcoming_payments
     set paid_at = now(), paid_transaction_id = v_tx, account_id = v_compte
   where id = p_echeance_id;

  -- Échéance récurrente : on prépare la suivante, sans dérive de fin de mois.
  if e.recurrence is not null then
    v_n := e.occurrence_index;
    loop
      v_n := v_n + 1;
      v_suivante := (coalesce(e.series_origin_date, e.due_date)
                     + (v_n * e.recurrence::interval))::date;
      exit when v_suivante > public.app_today();
      v_garde := v_garde + 1;
      if v_garde > 5000 then
        raise exception 'récurrence dégénérée sur la série %', e.series_id;
      end if;
    end loop;

    insert into public.upcoming_payments
      (name, due_date, amount_cents, category, account_id, recurrence,
       series_id, series_origin_date, occurrence_index)
    values
      (e.name, v_suivante, e.amount_cents, e.category, v_compte, e.recurrence,
       e.series_id, coalesce(e.series_origin_date, e.due_date), v_n);
  end if;

  return v_tx;
end $$;
