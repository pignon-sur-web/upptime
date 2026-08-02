-- Efface ce que `npm run verifier:application` a créé.
--
-- Le parcours écrit dans la vraie base : c'est le seul moyen de vérifier que
-- le rapprochement crée l'écart réel et qu'un virement laisse le net inchangé.
-- Tout ce qu'il crée porte le préfixe « ZZ-test », et ce fichier ne touche à
-- rien d'autre — un enregistrement personnel ne peut pas être emporté par
-- inadvertance.
--
--   psql "$DATABASE_URL" -f scripts/nettoyer-tests.sql
--   ou par l'API de gestion, comme les migrations.

begin;

-- Les écritures d'abord : elles référencent les comptes.
delete from public.transactions
where account_id in (select id from public.accounts where name like 'ZZ-test%')
   or label like 'ZZ-test%';

delete from public.upcoming_payments where name like 'ZZ-test%';
delete from public.accounts where name like 'ZZ-test%';
delete from public.budgets where category like 'ZZ-test%';

-- Les tâches avant les projets : la clé étrangère est en `set null`, donc
-- l'ordre n'est pas contraint, mais il évite de laisser des tâches orphelines
-- si l'une des deux suppressions échoue.
delete from public.tasks where title like 'ZZ-test%';
delete from public.projects where name like 'ZZ-test%';

-- Les lots d'import dont plus aucune tâche ne dépend.
delete from public.import_batches
where not exists (
  select 1 from public.tasks t where t.import_batch_id = import_batches.id
);

-- habit_logs part en cascade avec l'habitude.
delete from public.habits where name like 'ZZ-test%';

-- key_results part en cascade avec l'objectif.
delete from public.goals where name like 'ZZ-test%';

delete from public.events   where title like 'ZZ-test%';
delete from public.notes    where title like 'ZZ-test%';
delete from public.books    where title like 'ZZ-test%';
delete from public.courses  where name  like 'ZZ-test%';
delete from public.clients  where name  like 'ZZ-test%';
delete from public.workouts where type  like 'ZZ-test%';
delete from public.inbox_items where content like 'ZZ-test%';

-- Le journal n'est pas préfixable : son entrée est datée, pas nommée. On ne
-- retire que celle du jour, et seulement si elle est vide de tout texte —
-- autrement dit si personne n'a écrit dedans depuis.
delete from public.journal_entries
where date = public.app_today()
  and coalesce(done_text, '') = ''
  and coalesce(carry_over_text, '') = ''
  and coalesce(free_note, '') = ''
  and mood is null;

commit;

-- Ce qui reste, s'il reste quelque chose.
select 'habits' as table_, count(*) from public.habits where name like 'ZZ-test%'
union all select 'tasks',    count(*) from public.tasks    where title like 'ZZ-test%'
union all select 'projects', count(*) from public.projects where name  like 'ZZ-test%'
union all select 'accounts', count(*) from public.accounts where name  like 'ZZ-test%'
union all select 'goals',    count(*) from public.goals    where name  like 'ZZ-test%'
union all select 'transactions', count(*) from public.transactions where label like 'ZZ-test%';
