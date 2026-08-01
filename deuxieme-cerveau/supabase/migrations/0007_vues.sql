-- 0007 — Vues calculées.

-- —————————————————————————————————————————————————————————————————
-- security_invoker = true sur CHAQUE vue : ce n'est pas une précaution, c'est
-- la fermeture d'une brèche.
--
-- Une vue Postgres s'exécute par défaut avec les droits de son PROPRIÉTAIRE,
-- pas de l'appelant. Sans cette option, `solde_compte` — détenue par postgres,
-- construite au-dessus de tables protégées par RLS — resterait lisible par la
-- clé anonyme. Le mur « RLS activée, aucune policy » aurait un trou exactement
-- à la forme de vos finances.
--
-- Rien n'est matérialisé : une vue matérialisée demanderait un rafraîchissement,
-- et un solde périmé est un bien pire défaut qu'une requête de trois
-- millisecondes.
-- —————————————————————————————————————————————————————————————————

-- Solde des comptes ————————————————————————————————————————————————
--
-- `solde_pointe_cents` s'arrête à aujourd'hui. Le jour où une écriture est
-- post-datée, « pourquoi mon application ne dit pas la même chose que ma
-- banque » a une réponse immédiate au lieu d'une enquête.

create or replace view public.solde_compte with (security_invoker = true) as
select
  c.id                                                  as account_id,
  c.name,
  c.type,
  c.currency,
  c.position,
  c.archived,
  c.opening_balance_cents,
  (c.opening_balance_cents + coalesce(sum(t.amount_cents), 0))::bigint
                                                        as solde_cents,
  (c.opening_balance_cents
    + coalesce(sum(t.amount_cents) filter (where t.date <= public.app_today()), 0))::bigint
                                                        as solde_pointe_cents,
  count(t.id)                                           as nb_ecritures,
  max(t.date)                                           as derniere_ecriture
from public.accounts c
left join public.transactions t on t.account_id = c.id
group by c.id;

-- Score d'habitudes par jour ——————————————————————————————————————
--
-- Une habitude compte le jour D si elle avait commencé, n'était pas encore
-- archivée, et que D fait partie de ses jours programmés. Conséquence voulue :
-- archiver une habitude aujourd'hui ne change aucun score passé.
--
-- La jointure sur `habits` est EXTERNE, et c'est porteur : un jour où rien
-- n'était programmé doit exister quand même, avec attendues = 0 et
-- score = null. `null` veut dire « rien ne vous était demandé », que
-- l'interface affiche par un tiret. `0` voudrait dire « vous avez échoué »,
-- ce qui serait faux.

create or replace view public.score_habitude_jour with (security_invoker = true) as
with bornes as (
  select
    least(
      coalesce((select min(started_on) from public.habits),    public.app_today()),
      coalesce((select min(date)       from public.habit_logs), public.app_today())
    ) as du,
    public.app_today() as au
),
jours as (
  select d::date as date
  from bornes, generate_series(bornes.du, bornes.au, interval '1 day') d
)
select
  j.date,
  count(h.id)                                          as attendues,
  count(l.id) filter (where l.done)                    as cochees,
  case
    when count(h.id) = 0 then null
    else round(count(l.id) filter (where l.done)::numeric / count(h.id), 4)
  end                                                  as score
from jours j
left join public.habits h
       on h.started_on <= j.date
      and (h.archived_on is null or j.date < h.archived_on)
      and extract(isodow from j.date)::smallint = any(h.days_of_week)
left join public.habit_logs l
       on l.habit_id = h.id and l.date = j.date
group by j.date;

-- Avancement des projets ——————————————————————————————————————————
--
-- Les tâches annulées disparaissent du numérateur ET du dénominateur : c'est
-- la seule lecture sensée de « annulé ».
--
-- Un projet sans aucune tâche rend `null`, pas `0` : il n'est pas à 0 %, il est
-- indéterminé. L'interface affiche un tiret.

create or replace view public.avancement_projet with (security_invoker = true) as
select
  p.id as project_id,
  count(t.id) filter (where t.status <> 'annule')            as taches_total,
  count(t.id) filter (where t.status = 'fait')               as taches_faites,
  case
    when count(t.id) filter (where t.status <> 'annule') = 0 then null
    else round(
      count(t.id) filter (where t.status = 'fait')::numeric
      / count(t.id) filter (where t.status <> 'annule'), 4)
  end                                                        as avancement,
  case
    when p.due_date is null then null
    else p.due_date - public.app_today()
  end                                                        as jours_restants
from public.projects p
left join public.tasks t on t.project_id = p.id
group by p.id;

-- Progression des objectifs ————————————————————————————————————————
--
-- La forme (actuel − départ) / (cible − départ) gère gratuitement les
-- résultats clés DÉCROISSANTS : perdre 8 kg, départ 86, cible 78, actuel 82
-- donne bien 0,5. Un simple actuel/cible se tromperait.
--
-- Cas dégénéré cible = départ : tout ou rien, plutôt qu'une division par zéro.

create or replace view public.progression_resultat_cle with (security_invoker = true) as
select
  rc.*,
  (case
     when rc.target_value = rc.start_value then
       case when rc.current_value >= rc.target_value then 1.0 else 0.0 end
     else greatest(0.0, least(1.0,
       (rc.current_value - rc.start_value) / (rc.target_value - rc.start_value)))
   end)::numeric(6,4) as progression
from public.key_results rc;

create or replace view public.progression_objectif with (security_invoker = true) as
select
  o.id                       as goal_id,
  count(rc.id)               as nb_resultats,
  round(avg(rc.progression), 4) as progression   -- null si aucun résultat clé
from public.goals o
left join public.progression_resultat_cle rc on rc.goal_id = o.id
group by o.id;

-- Le mois en argent ————————————————————————————————————————————————
--
-- Décision : virements et ajustements sont EXCLUS des entrées, sorties et net.
--
-- Un virement entre deux de vos comptes n'est ni un revenu ni une dépense ;
-- l'inclure compterait l'argent deux fois et viderait « net » de son sens.
-- Un ajustement est une correction de mesure, pas un événement économique : il
-- compte dans le solde, puisque c'est une vraie écriture, mais pas dans
-- « combien ai-je dépensé ».
--
-- Le total des ajustements reste visible à part, et c'est délibéré : s'il
-- grossit, c'est le signe qu'on oublie de saisir des transactions.

create or replace view public.finances_mensuelles with (security_invoker = true) as
select
  date_trunc('month', t.date)::date as mois,
  coalesce( sum(t.amount_cents) filter (where t.kind = 'revenu'),     0)::bigint as entrees_cents,
  coalesce(-sum(t.amount_cents) filter (where t.kind = 'depense'),    0)::bigint as sorties_cents,
  coalesce( sum(t.amount_cents) filter (where t.kind in ('revenu','depense')), 0)::bigint as net_cents,
  coalesce( sum(t.amount_cents) filter (where t.kind = 'ajustement'), 0)::bigint as ajustements_cents,
  count(*) filter (where t.kind in ('revenu','depense'))                        as nb_ecritures
from public.transactions t
group by 1;

-- Dépenses par catégorie, avec comparaison au mois précédent ————————
--
-- Le remplissage des mois vides (`grille`) est ce qui rend la comparaison
-- juste. Un `lag()` posé directement sur les dépenses réelles sauterait
-- par-dessus un mois sans dépense dans cette catégorie et comparerait à un
-- chiffre vieux de deux mois, en l'annonçant comme « le mois dernier ».

create or replace view public.depenses_par_categorie with (security_invoker = true) as
with mois as (
  select generate_series(
    coalesce((select date_trunc('month', min(date)) from public.transactions),
             date_trunc('month', public.app_today())),
    date_trunc('month', public.app_today()),
    interval '1 month')::date as mois
),
categories as (
  select distinct category
  from public.transactions
  where category is not null and kind = 'depense'
),
grille as (
  select m.mois, c.category from mois m cross join categories c
),
reelles as (
  select date_trunc('month', t.date)::date as mois,
         t.category,
         (-sum(t.amount_cents))::bigint as depense_cents
  from public.transactions t
  where t.kind = 'depense' and t.category is not null
  group by 1, 2
),
remplie as (
  select g.mois, g.category, coalesce(r.depense_cents, 0)::bigint as depense_cents
  from grille g
  left join reelles r on r.mois = g.mois and r.category = g.category
)
select
  f.mois,
  f.category,
  f.depense_cents,
  coalesce(lag(f.depense_cents) over fenetre, 0)                    as depense_precedente_cents,
  f.depense_cents - coalesce(lag(f.depense_cents) over fenetre, 0)  as variation_cents
from remplie f
window fenetre as (partition by f.category order by f.mois);

-- Budgets ——————————————————————————————————————————————————————————
--
-- Plafond du mois s'il existe, sinon plafond par défaut. Un dépassement se
-- signale par INVERSION de la ligne : aucun rouge n'est disponible, et
-- l'inversion crie de toute façon plus fort.

create or replace view public.budget_statut with (security_invoker = true) as
select
  d.mois,
  d.category,
  d.depense_cents,
  coalesce(bm.monthly_cap_cents, bd.monthly_cap_cents)::bigint as plafond_cents,
  case
    when coalesce(bm.monthly_cap_cents, bd.monthly_cap_cents) is null then null
    else round(d.depense_cents::numeric
               / coalesce(bm.monthly_cap_cents, bd.monthly_cap_cents), 4)
  end as consommation
from public.depenses_par_categorie d
left join public.budgets bm on bm.category = d.category and bm.month = d.mois
left join public.budgets bd on bd.category = d.category and bd.month is null;
