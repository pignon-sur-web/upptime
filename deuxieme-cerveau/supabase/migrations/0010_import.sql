-- 0010 — Import de tâches par lot, et annulation d'un lot.

-- —————————————————————————————————————————————————————————————————
-- Importer en une seule fonction plutôt qu'en boucle d'insertions depuis
-- l'application, pour deux raisons.
--
-- 1. Atomicité. Deux cents lignes insérées une par une peuvent s'arrêter à la
--    cent-vingtième sur une erreur réseau, laissant un import à moitié fait
--    dont personne ne sait où il s'est arrêté.
-- 2. Les projets créés au vol. Le même nom de projet apparaît sur des dizaines
--    de lignes ; le résoudre en SQL garantit qu'il n'est créé qu'une fois,
--    là où des insertions concurrentes en créeraient des doublons.
--
-- Le lot reçoit un identifiant, et c'est ce qui rend l'import réversible :
-- se tromper de colonne sur trois cents lignes doit se défaire d'une tape.
-- —————————————————————————————————————————————————————————————————

create or replace function public.importer_taches(
  p_lignes jsonb,
  p_source text default null
) returns table (
  batch_id       uuid,
  taches_creees  integer,
  projets_crees  integer
)
language plpgsql as $$
declare
  v_batch    uuid;
  v_taches   integer := 0;
  v_projets  integer := 0;
  v_ligne    jsonb;
  v_projet   uuid;
  v_nom      text;
  v_statut   text;
begin
  if jsonb_typeof(p_lignes) <> 'array' then
    raise exception 'p_lignes doit être un tableau JSON'
      using errcode = 'invalid_parameter_value';
  end if;

  insert into public.import_batches (source, row_count)
  values (p_source, jsonb_array_length(p_lignes))
  returning id into v_batch;

  for v_ligne in select * from jsonb_array_elements(p_lignes)
  loop
    -- Une ligne sans titre n'est pas importable ; l'aperçu l'a déjà signalée.
    if coalesce(btrim(v_ligne->>'titre'), '') = '' then
      continue;
    end if;

    v_projet := null;
    v_nom := nullif(btrim(coalesce(v_ligne->>'projet', '')), '');

    if v_nom is not null then
      -- Rapprochement insensible à la casse : « Admin » et « admin » sortant
      -- du même export désignent le même projet.
      select id into v_projet
      from public.projects
      where lower(name) = lower(v_nom)
      limit 1;

      if v_projet is null then
        insert into public.projects (name) values (v_nom) returning id into v_projet;
        v_projets := v_projets + 1;
      end if;
    end if;

    v_statut := coalesce(v_ligne->>'statut', 'a_faire');
    if v_statut not in ('a_faire', 'en_cours', 'fait', 'annule') then
      v_statut := 'a_faire';
    end if;

    insert into public.tasks
      (title, priority, status, due_date, context, note, project_id,
       done_at, import_batch_id)
    values (
      btrim(v_ligne->>'titre'),
      nullif(v_ligne->>'priorite', '')::smallint,
      v_statut,
      nullif(v_ligne->>'echeance', '')::date,
      nullif(v_ligne->>'contexte', ''),
      nullif(v_ligne->>'note', ''),
      v_projet,
      -- La contrainte tasks_done_at_coherent impose l'un avec l'autre.
      case when v_statut = 'fait' then now() else null end,
      v_batch
    );

    v_taches := v_taches + 1;
  end loop;

  update public.import_batches set row_count = v_taches where id = v_batch;

  return query select v_batch, v_taches, v_projets;
end $$;

-- Défaire un lot.
--
-- Les projets créés au passage sont supprimés seulement s'ils sont restés
-- vides : un projet auquel on a depuis rattaché autre chose n'a plus rien à
-- voir avec l'import.
create or replace function public.annuler_import(p_batch_id uuid)
returns integer
language plpgsql as $$
declare
  v_supprimees integer;
begin
  delete from public.tasks where import_batch_id = p_batch_id;
  get diagnostics v_supprimees = row_count;

  delete from public.projects p
  where p.created_at >= (
          select b.created_at from public.import_batches b where b.id = p_batch_id
        )
    and not exists (select 1 from public.tasks t where t.project_id = p.id);

  delete from public.import_batches where id = p_batch_id;

  return v_supprimees;
end $$;
