-- Contrôles de la logique calculée. Lancé par scripts/verifier-sql.sh.
--
-- Chaque contrôle cible une décision de conception documentée dans les
-- migrations. Un échec ici veut dire qu'une de ces décisions ne tient pas.

\set QUIET on
\pset tuples_only off

create temp table resultat (nom text, ok boolean, detail text);

create or replace function pg_temp.verifier(p_nom text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into resultat values (p_nom, p_ok, p_detail);
$$;

-- —————————————————————————————————————————————————————————————————
-- Fuseau
-- —————————————————————————————————————————————————————————————————
do $$
begin
  perform pg_temp.verifier(
    'app_today() suit Europe/Brussels',
    public.app_today() = (now() at time zone 'Europe/Brussels')::date,
    'app_today = ' || public.app_today()
  );
end $$;

-- —————————————————————————————————————————————————————————————————
-- Score d'habitudes
-- —————————————————————————————————————————————————————————————————
do $$
declare
  h_quotidienne uuid;
  h_semaine     uuid;
  h_archivee    uuid;
  v_hier        date := public.app_today() - 1;
  v_score_avant numeric;
  v_score_apres numeric;
begin
  insert into public.habits (name, started_on) values ('Lecture', v_hier - 30)
    returning id into h_quotidienne;
  insert into public.habits (name, started_on, days_of_week)
    values ('Sport', v_hier - 30, '{1,2,3,4,5}') returning id into h_semaine;
  insert into public.habits (name, started_on) values ('Méditation', v_hier - 30)
    returning id into h_archivee;

  -- Hier : deux cochées sur trois (ou deux sur deux si hier est un week-end).
  insert into public.habit_logs (habit_id, date, done)
    values (h_quotidienne, v_hier, true), (h_archivee, v_hier, true);

  select score into v_score_avant from public.score_habitude_jour where date = v_hier;

  -- On archive une habitude AUJOURD'HUI : le score d'hier ne doit pas bouger.
  update public.habits set archived_on = public.app_today() where id = h_archivee;
  select score into v_score_apres from public.score_habitude_jour where date = v_hier;

  perform pg_temp.verifier(
    'archiver une habitude ne réécrit pas les scores passés',
    v_score_avant is not distinct from v_score_apres,
    'avant ' || coalesce(v_score_avant::text, 'null') ||
    ' / après ' || coalesce(v_score_apres::text, 'null')
  );
end $$;

do $$
declare v_attendues bigint; v_score numeric; v_jour date;
begin
  -- Un samedi où seule l'habitude « semaine » aurait été programmée : il faut
  -- que le jour existe quand même, avec un score null et non zéro.
  delete from public.habits;
  insert into public.habits (name, started_on, days_of_week)
    values ('Sport', public.app_today() - 30, '{1,2,3,4,5}');

  select date into v_jour from public.score_habitude_jour
   where extract(isodow from date) = 6 and date < public.app_today()
   order by date desc limit 1;

  select attendues, score into v_attendues, v_score
    from public.score_habitude_jour where date = v_jour;

  perform pg_temp.verifier(
    'un jour sans habitude programmée existe avec score null',
    v_attendues = 0 and v_score is null,
    'samedi ' || v_jour || ' : attendues=' || v_attendues ||
    ' score=' || coalesce(v_score::text, 'null')
  );
end $$;

-- —————————————————————————————————————————————————————————————————
-- Séries
-- —————————————————————————————————————————————————————————————————
do $$
declare
  h      uuid;
  v_jour date;
  v_serie integer;
begin
  delete from public.habits;
  insert into public.habits (name, started_on, days_of_week)
    values ('Sport', public.app_today() - 60, '{1,2,3,4,5}') returning id into h;

  -- Cochée tous les jours ouvrés des 60 derniers jours, sauf aujourd'hui.
  for v_jour in
    select d::date from generate_series(public.app_today() - 60, public.app_today() - 1, interval '1 day') d
    where extract(isodow from d) between 1 and 5
  loop
    insert into public.habit_logs (habit_id, date, done) values (h, v_jour, true);
  end loop;

  v_serie := public.serie_habitude(h);
  perform pg_temp.verifier(
    'une habitude en semaine ne casse pas sa série le week-end',
    v_serie >= 40,
    'série = ' || v_serie || ' jours ouvrés consécutifs'
  );

  perform pg_temp.verifier(
    'aujourd''hui non coché ne casse pas encore la série',
    public.serie_habitude(h) = v_serie,
    'la rupture se constate le lendemain, pas à minuit'
  );
end $$;

-- —————————————————————————————————————————————————————————————————
-- Tâches récurrentes
-- —————————————————————————————————————————————————————————————————
do $$
declare
  t1 uuid; t2 uuid; v_nouvelle uuid; v_echeance date; v_ouvertes integer;
begin
  -- Quotidienne oubliée depuis 8 jours : une SEULE occurrence doit naître,
  -- datée de demain, sans chaîne de rattrapage.
  insert into public.tasks (title, due_date, recurrence, recurrence_anchor)
    values ('Arroser', public.app_today() - 8, 'P1D', 'schedule') returning id into t1;

  v_nouvelle := public.completer_tache(t1);
  select due_date into v_echeance from public.tasks where id = v_nouvelle;
  select count(*) into v_ouvertes from public.tasks
   where series_id = (select series_id from public.tasks where id = t1)
     and status in ('a_faire','en_cours');

  perform pg_temp.verifier(
    'tâche quotidienne en retard de 8 jours : un seul saut',
    v_echeance = public.app_today() + 1 and v_ouvertes = 1,
    'échéance ' || v_echeance || ', ' || v_ouvertes || ' occurrence ouverte'
  );

  -- Double tape : la seconde ne doit rien créer.
  insert into public.tasks (title, due_date, recurrence)
    values ('Courses', public.app_today(), 'P1W') returning id into t2;
  perform public.completer_tache(t2);
  perform pg_temp.verifier(
    'double complétion : la seconde tape ne crée rien',
    public.completer_tache(t2) is null,
    'retour null, idempotent'
  );
end $$;

do $$
declare
  t uuid; v_id uuid; v_jours integer[] := '{}';
begin
  -- Fin de mois : origine au 31 janvier, mensuel. Les échéances doivent
  -- revenir au 31 dès que le mois le permet, au lieu de rester bloquées au 28
  -- ou au 30 après une seule troncature.
  insert into public.tasks (title, due_date, series_origin_date, recurrence, recurrence_anchor)
    values ('Loyer', date '2026-01-31', date '2026-01-31', 'P1M', 'schedule')
    returning id into t;

  for i in 1..3 loop
    v_id := public.completer_tache(t);
    select array_append(v_jours, extract(day from due_date)::integer)
      into v_jours from public.tasks where id = v_id;
    t := v_id;
  end loop;

  perform pg_temp.verifier(
    'récurrence mensuelle : pas de dérive de fin de mois',
    31 = any(v_jours) and v_jours[1] > 27,
    'jours du mois obtenus : ' || v_jours::text
  );
end $$;

-- —————————————————————————————————————————————————————————————————
-- Import CSV
-- —————————————————————————————————————————————————————————————————
do $$
declare
  v_batch uuid; v_taches integer; v_projets integer;
  v_nb_projets integer; v_done_at timestamptz; v_supprimees integer;
begin
  delete from public.tasks;
  delete from public.projects;

  -- Deux lignes désignent le même projet à la casse près : il ne doit être
  -- créé qu'une fois.
  select batch_id, taches_creees, projets_crees
    into v_batch, v_taches, v_projets
  from public.importer_taches($j$[
    {"titre":"Appeler le comptable","priorite":"1","echeance":"2026-09-15","projet":"Administratif","statut":"a_faire"},
    {"titre":"Classer les factures","priorite":"3","echeance":"","projet":"administratif","statut":"a_faire"},
    {"titre":"Déjà fait","priorite":"","echeance":"","projet":"","statut":"fait"}
  ]$j$::jsonb, 'export.csv');

  select count(*) into v_nb_projets from public.projects;

  perform pg_temp.verifier(
    'import : projets rapprochés sans tenir compte de la casse',
    v_taches = 3 and v_projets = 1 and v_nb_projets = 1,
    v_taches || ' tâches, ' || v_projets || ' projet créé, ' || v_nb_projets || ' au total'
  );

  select done_at into v_done_at from public.tasks where title = 'Déjà fait';
  perform pg_temp.verifier(
    'import : une ligne déjà faite reçoit son done_at',
    v_done_at is not null,
    'la contrainte tasks_done_at_coherent l''exige'
  );

  -- Annulation du lot : les tâches partent, et le projet créé au passage aussi
  -- puisqu'il est resté vide.
  v_supprimees := public.annuler_import(v_batch);

  perform pg_temp.verifier(
    'annuler un import retire tâches et projets restés vides',
    v_supprimees = 3
      and (select count(*) from public.tasks) = 0
      and (select count(*) from public.projects) = 0
      and (select count(*) from public.import_batches where id = v_batch) = 0,
    v_supprimees || ' tâches supprimées'
  );
end $$;

do $$
declare v_batch uuid; v_projet uuid;
begin
  delete from public.tasks;
  delete from public.projects;

  select batch_id into v_batch from public.importer_taches(
    '[{"titre":"Une tâche","projet":"Gardé"}]'::jsonb, null);

  select id into v_projet from public.projects where name = 'Gardé';
  -- On rattache autre chose au projet : il ne doit plus disparaître.
  insert into public.tasks (title, project_id) values ('Ajoutée à la main', v_projet);

  perform public.annuler_import(v_batch);

  perform pg_temp.verifier(
    'un projet devenu non vide survit à l''annulation',
    (select count(*) from public.projects where id = v_projet) = 1
      and (select count(*) from public.tasks) = 1,
    'seules les lignes du lot sont retirées'
  );
end $$;

-- —————————————————————————————————————————————————————————————————
-- Finances
-- —————————————————————————————————————————————————————————————————
do $$
declare
  c1 uuid; c2 uuid; v_groupe uuid;
  v_net_avant bigint; v_net_apres bigint;
  v_s1 bigint; v_s2 bigint;
begin
  insert into public.accounts (name, opening_balance_cents) values ('Courant', 100000) returning id into c1;
  insert into public.accounts (name, type, opening_balance_cents) values ('Épargne', 'epargne', 500000) returning id into c2;

  insert into public.transactions (account_id, label, amount_cents, kind, category)
    values (c1, 'Salaire', 250000, 'revenu', 'salaire'),
           (c1, 'Courses', -8500, 'depense', 'alimentation');

  select net_cents into v_net_avant from public.finances_mensuelles
   where mois = date_trunc('month', public.app_today())::date;

  v_groupe := public.enregistrer_virement(c1, c2, 50000);

  select net_cents into v_net_apres from public.finances_mensuelles
   where mois = date_trunc('month', public.app_today())::date;
  select solde_cents into v_s1 from public.solde_compte where account_id = c1;
  select solde_cents into v_s2 from public.solde_compte where account_id = c2;

  perform pg_temp.verifier(
    'virement : deux jambes, somme nulle, net mensuel inchangé',
    (select count(*) from public.transactions where transfer_group_id = v_groupe) = 2
    and (select sum(amount_cents) from public.transactions where transfer_group_id = v_groupe) = 0
    and v_net_avant = v_net_apres,
    'net ' || v_net_avant || ' → ' || v_net_apres || ', soldes ' || v_s1 || ' / ' || v_s2
  );

  perform pg_temp.verifier(
    'virement : les soldes ont bien bougé des deux côtés',
    v_s1 = 100000 + 250000 - 8500 - 50000 and v_s2 = 500000 + 50000,
    'courant ' || v_s1 || ', épargne ' || v_s2
  );

  perform public.supprimer_virement(v_groupe);
  perform pg_temp.verifier(
    'supprimer un virement retire ses deux jambes',
    (select count(*) from public.transactions where transfer_group_id = v_groupe) = 0
  );
end $$;

do $$
declare
  c uuid; v_calcule bigint; v_ecart bigint; v_tx uuid; v_solde bigint; v_lignes integer;
begin
  -- Repartir d'une base vide : le contrôle porte sur les totaux du mois, qui
  -- seraient pollués par les écritures du contrôle précédent.
  delete from public.transactions;
  delete from public.accounts;

  insert into public.accounts (name, opening_balance_cents) values ('Test', 0) returning id into c;
  insert into public.transactions (account_id, label, amount_cents, kind)
    values (c, 'Achat', -1234, 'depense');

  -- Solde réel lu sur l'app bancaire : 100,00 € alors que le calcul dit -12,34 €.
  select transaction_id, calcule_cents, ecart_cents into v_tx, v_calcule, v_ecart
    from public.enregistrer_ajustement(c, 10000);
  select solde_cents into v_solde from public.solde_compte where account_id = c;

  perform pg_temp.verifier(
    'rapprochement : l''écart vaut exactement la différence',
    v_calcule = -1234 and v_ecart = 11234 and v_solde = 10000,
    'calculé ' || v_calcule || ', écart ' || v_ecart || ', solde final ' || v_solde
  );

  select count(*) into v_lignes from public.transactions where account_id = c;
  select transaction_id, ecart_cents into v_tx, v_ecart
    from public.enregistrer_ajustement(c, 10000);

  perform pg_temp.verifier(
    'second rapprochement à vide : aucune ligne créée',
    v_ecart = 0 and v_tx is null
      and (select count(*) from public.transactions where account_id = c) = v_lignes,
    'écart ' || v_ecart || ', toujours ' || v_lignes || ' écritures'
  );

  perform pg_temp.verifier(
    'l''ajustement est exclu du net mensuel mais compté dans le solde',
    (select coalesce(sum(ajustements_cents),0) from public.finances_mensuelles) = 11234
    and (select coalesce(sum(net_cents),0) from public.finances_mensuelles
         where mois = date_trunc('month', public.app_today())::date) = -1234
  );
end $$;

do $$
declare
  c uuid; e uuid; v_tx uuid; v_solde bigint; v_suivante date; v_nb integer;
begin
  delete from public.transactions;
  delete from public.upcoming_payments;
  delete from public.accounts;

  insert into public.accounts (name, opening_balance_cents) values ('Courant', 200000)
    returning id into c;

  -- Loyer mensuel né le 31 janvier : le paiement doit créer l'écriture ET
  -- préparer l'échéance suivante sans dérive de fin de mois.
  insert into public.upcoming_payments
    (name, due_date, series_origin_date, amount_cents, category, account_id, recurrence)
  values ('Loyer', date '2026-01-31', date '2026-01-31', 95000, 'logement', c, 'P1M')
  returning id into e;

  v_tx := public.payer_echeance(e);

  select solde_cents into v_solde from public.solde_compte where account_id = c;
  select count(*) into v_nb from public.upcoming_payments where paid_at is null;
  select due_date into v_suivante from public.upcoming_payments where paid_at is null;

  perform pg_temp.verifier(
    'payer une échéance crée l''écriture et débite le compte',
    v_tx is not null and v_solde = 200000 - 95000
      and (select kind from public.transactions where id = v_tx) = 'depense',
    'solde ' || v_solde
  );

  perform pg_temp.verifier(
    'échéance récurrente : la suivante est préparée, au bon quantième',
    v_nb = 1 and extract(day from v_suivante) = 31 and v_suivante > public.app_today(),
    'prochaine échéance ' || v_suivante
  );

  perform pg_temp.verifier(
    'payer deux fois ne double pas l''écriture',
    public.payer_echeance(e) = v_tx
      and (select count(*) from public.transactions where account_id = c) = 1,
    'idempotent'
  );
end $$;

do $$
declare v_precedente bigint; v_mois date;
begin
  -- Catégorie avec un mois creux : la comparaison doit se faire à 0, pas à un
  -- chiffre d'il y a deux mois.
  delete from public.transactions;
  delete from public.accounts;
  insert into public.accounts (name) values ('C') ;

  insert into public.transactions (account_id, date, label, amount_cents, kind, category)
  select id, (date_trunc('month', public.app_today()) - interval '2 months')::date,
         'Restaurant', -5000, 'depense', 'restaurant' from public.accounts limit 1;
  insert into public.transactions (account_id, date, label, amount_cents, kind, category)
  select id, public.app_today(), 'Restaurant', -3000, 'depense', 'restaurant'
    from public.accounts limit 1;
  -- Rien le mois intermédiaire.

  select depense_precedente_cents into v_precedente
    from public.depenses_par_categorie
   where category = 'restaurant' and mois = date_trunc('month', public.app_today())::date;

  perform pg_temp.verifier(
    'un mois creux se compare à 0, pas au mois d''avant',
    v_precedente = 0,
    'dépense du mois précédent rapportée : ' || v_precedente
  );
end $$;

-- —————————————————————————————————————————————————————————————————
-- Projets et objectifs
-- —————————————————————————————————————————————————————————————————
do $$
declare p uuid; v_av numeric; o uuid; v_prog numeric;
begin
  insert into public.projects (name) values ('Site vitrine') returning id into p;
  select avancement into v_av from public.avancement_projet where project_id = p;
  perform pg_temp.verifier(
    'projet sans tâche : avancement null, pas 0 %',
    v_av is null,
    'un projet neuf est indéterminé, pas à zéro'
  );

  insert into public.tasks (title, project_id, status, done_at)
    values ('A', p, 'fait', now());
  insert into public.tasks (title, project_id) values ('B', p);
  insert into public.tasks (title, project_id, status) values ('C', p, 'annule');
  select avancement into v_av from public.avancement_projet where project_id = p;
  perform pg_temp.verifier(
    'les tâches annulées sortent du numérateur ET du dénominateur',
    v_av = 0.5,
    '1 faite / 2 actives = ' || v_av
  );

  -- Résultat clé décroissant : perdre 8 kg, à mi-parcours.
  insert into public.goals (name) values ('Forme') returning id into o;
  insert into public.key_results (goal_id, name, start_value, current_value, target_value)
    values (o, 'Poids', 86, 82, 78);
  select progression into v_prog from public.progression_objectif where goal_id = o;
  perform pg_temp.verifier(
    'résultat clé décroissant : progression correcte',
    v_prog = 0.5,
    '86 → 82 sur une cible de 78 = ' || v_prog
  );

  insert into public.goals (name) values ('Sans résultat clé') returning id into o;
  select progression into v_prog from public.progression_objectif where goal_id = o;
  perform pg_temp.verifier('objectif sans résultat clé : progression null', v_prog is null);
end $$;

-- —————————————————————————————————————————————————————————————————
-- Verrouillage : c'est le contrôle qui compte le plus.
-- —————————————————————————————————————————————————————————————————
do $$
declare v_fuites text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into v_fuites
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r','v')
    and (
      has_table_privilege('anon', c.oid, 'SELECT')
      or has_table_privilege('authenticated', c.oid, 'SELECT')
    );

  perform pg_temp.verifier(
    'anon ne peut lire aucune table ni aucune vue',
    v_fuites is null,
    coalesce('LISIBLES PAR ANON : ' || v_fuites, 'aucune fuite')
  );
end $$;

do $$
declare v_sans_invoker text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into v_sans_invoker
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'v'
    and not coalesce(
      (select option_value::boolean from pg_options_to_table(c.reloptions)
        where option_name = 'security_invoker'), false);

  perform pg_temp.verifier(
    'toutes les vues portent security_invoker',
    v_sans_invoker is null,
    coalesce('SANS INVOKER : ' || v_sans_invoker, 'toutes conformes')
  );
end $$;

do $$
declare v_sans_rls text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into v_sans_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

  perform pg_temp.verifier(
    'toutes les tables ont la RLS activée',
    v_sans_rls is null,
    coalesce('SANS RLS : ' || v_sans_rls, 'toutes conformes')
  );
end $$;

do $$
declare v_definer text;
begin
  select string_agg(p.proname, ', ' order by p.proname) into v_definer
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef;

  perform pg_temp.verifier(
    'aucune fonction en SECURITY DEFINER',
    v_definer is null,
    coalesce('DEFINER : ' || v_definer, 'toutes en invoker')
  );
end $$;

-- —————————————————————————————————————————————————————————————————
\pset format aligned
\echo ''
select
  case when ok then 'ok' else 'ECHEC' end as etat,
  nom as "contrôle",
  detail as "détail"
from resultat;

\echo ''
select
  count(*) filter (where ok) || '/' || count(*) || ' contrôles passés' as "résultat"
from resultat;

do $$
declare v_echecs integer;
begin
  select count(*) into v_echecs from resultat where not ok;
  if v_echecs > 0 then
    raise exception '% contrôle(s) en échec', v_echecs;
  end if;
end $$;
