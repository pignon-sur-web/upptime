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
-- Import CSV
-- —————————————————————————————————————————————————————————————————
do $$
declare
  v_lot       uuid;
  v_taches    integer;
  v_projets   integer;
  v_avant     integer;
  v_supprimes integer;
  v_restantes integer;
  v_projet    text;
  v_fait      integer;
begin
  select count(*) into v_avant from public.tasks;

  select batch_id, nb_taches, nb_projets into v_lot, v_taches, v_projets
  from public.importer_taches(
    jsonb_build_array(
      -- « Site vitrine » existe déjà : l'import doit s'y raccrocher, pas en
      -- créer un homonyme.
      jsonb_build_object('titre', 'Relancer le devis', 'projet', 'Site vitrine',
                         'echeance', '2026-04-03', 'priorite', '1'),
      -- Projet inconnu, écrit deux fois avec une casse et des espaces
      -- différents : un seul doit naître.
      jsonb_build_object('titre', 'Livrer la maquette', 'projet', 'Refonte du blog',
                         'statut', 'fait'),
      jsonb_build_object('titre', 'Choisir la police', 'projet', '  refonte DU BLOG ',
                         'contexte', 'perso')
    ),
    'export-todoist.csv'
  );

  perform pg_temp.verifier(
    'import : projet existant réutilisé, projet inconnu créé une seule fois',
    v_taches = 3 and v_projets = 1,
    v_taches || ' tâches, ' || v_projets || ' projet créé'
  );

  select count(*) into v_fait
  from public.tasks where import_batch_id = v_lot and status = 'fait' and done_at is not null;
  perform pg_temp.verifier(
    'import : une ligne « fait » reçoit son done_at',
    v_fait = 1,
    'la contrainte tasks_done_at_coherent aurait rejeté le contraire'
  );

  select string_agg(distinct p.name, ' + ' order by p.name) into v_projet
  from public.projects p
  join public.tasks t on t.project_id = p.id
  where t.import_batch_id = v_lot;
  perform pg_temp.verifier(
    'import : les deux graphies rejoignent le même projet',
    v_projet = 'Refonte du blog + Site vitrine',
    coalesce(v_projet, '(aucun)')
  );

  -- Annulation du lot.
  select public.annuler_import(v_lot) into v_supprimes;
  select count(*) into v_restantes from public.tasks;
  perform pg_temp.verifier(
    'annuler un lot d''import le défait entièrement',
    v_supprimes = 3 and v_restantes = v_avant,
    v_supprimes || ' supprimées, ' || v_restantes || ' tâches restantes'
  );

  perform pg_temp.verifier(
    'le projet créé par l''import survit à l''annulation',
    exists (select 1 from public.projects where name = 'Refonte du blog'),
    'il peut déjà porter des tâches hors du lot'
  );
end $$;

-- —————————————————————————————————————————————————————————————————
-- Budgets
-- —————————————————————————————————————————————————————————————————
do $$
declare
  v_mois      date := date_trunc('month', public.app_today())::date;
  v_plafond   bigint;
  v_conso     numeric;
  v_erreur    text;
  v_compte    uuid;
begin
  -- `budget_statut` se construit au-dessus de `depenses_par_categorie`, qui
  -- n'énumère que les catégories réellement dépensées : sans écriture, la
  -- catégorie n'existe pas et la vue ne peut rien en dire. C'est pour ça que
  -- l'écran Budgets lit la table `budgets` et retombe sur zéro, plutôt que de
  -- se fier à la vue seule.
  insert into public.accounts (name) values ('Courant budgets') returning id into v_compte;
  insert into public.transactions (account_id, date, label, amount_cents, kind, category)
  values (v_compte, public.app_today(), 'Delhaize', -25000, 'depense', 'Courses');

  -- Un plafond par défaut et un plafond du mois coexistent sur la même
  -- catégorie : ce sont deux index uniques PARTIELS distincts.
  insert into public.budgets (category, monthly_cap_cents, month) values ('Courses', 8000, null);
  insert into public.budgets (category, monthly_cap_cents, month) values ('Courses', 20000, v_mois);

  perform pg_temp.verifier(
    'un plafond par défaut et un plafond mensuel coexistent',
    (select count(*) from public.budgets where category = 'Courses') = 2
  );

  -- Et c'est bien celui du mois qui l'emporte dans la vue.
  select plafond_cents, consommation into v_plafond, v_conso
  from public.budget_statut
  where category = 'Courses' and mois = v_mois;

  perform pg_temp.verifier(
    'le plafond du mois l''emporte sur le plafond par défaut',
    v_plafond = 20000,
    'plafond retenu : ' || coalesce(v_plafond::text, 'aucun')
  );

  -- 250 € dépensés sous un plafond de 200 € : la ligne doit basculer en
  -- inversion dans l'interface, et c'est cette valeur qui le décide.
  perform pg_temp.verifier(
    'un dépassement se voit dans la consommation',
    v_conso > 1,
    'consommation = ' || coalesce(v_conso::text, 'null')
  );

  -- Le piège que l'action serveur contourne : ON CONFLICT ne peut pas viser
  -- un index partiel sans en reprendre le prédicat. Ce contrôle fige la
  -- raison pour laquelle enregistrerBudget lit avant d'écrire.
  begin
    insert into public.budgets (category, monthly_cap_cents, month)
    values ('Courses', 9000, null)
    on conflict (category) do update set monthly_cap_cents = excluded.monthly_cap_cents;
    v_erreur := null;
  exception when others then
    v_erreur := sqlstate;
  end;

  perform pg_temp.verifier(
    'ON CONFLICT (category) ne peut pas viser l''index partiel',
    v_erreur is not null,
    coalesce('refusé, code ' || v_erreur, 'ACCEPTÉ — l''upsert redeviendrait possible')
  );
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
