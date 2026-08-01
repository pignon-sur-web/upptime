-- 0010 — Import CSV de tâches, et son annulation.
--
-- L'insertion est une fonction SQL et non une boucle dans l'action serveur,
-- pour une raison simple : une fonction s'exécute dans UNE transaction. Trois
-- cents lignes passent toutes ou aucune. Une boucle applicative, elle, peut
-- s'interrompre au milieu et laisser cent quarante tâches orphelines dans un
-- écran qu'on vient de remplir de travers — précisément le moment où on a le
-- moins envie de faire du ménage à la main.
--
-- Chaque lot porte un import_batch_id : annuler tient en une tape.

create or replace function public.importer_taches(
  p_lignes jsonb,
  p_source text default null
) returns table (
  batch_id   uuid,
  nb_taches  integer,
  nb_projets integer
)
language plpgsql as $$
declare
  v_batch    uuid;
  v_ligne    jsonb;
  v_projet   uuid;
  v_nom      text;
  v_statut   text;
  v_taches   integer := 0;
  v_projets  integer := 0;
begin
  if jsonb_typeof(p_lignes) <> 'array' then
    raise exception 'importer_taches attend un tableau JSON'
      using errcode = 'invalid_parameter_value';
  end if;

  insert into public.import_batches (source, row_count)
  values (p_source, jsonb_array_length(p_lignes))
  returning id into v_batch;

  for v_ligne in select * from jsonb_array_elements(p_lignes)
  loop
    v_projet := null;
    v_nom := nullif(btrim(coalesce(v_ligne->>'projet', '')), '');

    -- Les projets absents sont créés par nom. La comparaison est insensible à
    -- la casse et aux espaces de bord : « Site vitrine » et « site vitrine  »
    -- dans le même export ne doivent pas produire deux projets.
    if v_nom is not null then
      select p.id into v_projet
      from public.projects p
      where lower(btrim(p.name)) = lower(v_nom)
      limit 1;

      if v_projet is null then
        insert into public.projects (name) values (v_nom) returning id into v_projet;
        v_projets := v_projets + 1;
      end if;
    end if;

    v_statut := coalesce(nullif(v_ligne->>'statut', ''), 'a_faire');
    if v_statut not in ('a_faire', 'en_cours', 'fait', 'annule') then
      v_statut := 'a_faire';
    end if;

    insert into public.tasks
      (title, priority, status, due_date, context, note, project_id,
       import_batch_id, done_at)
    values (
      btrim(v_ligne->>'titre'),
      nullif(v_ligne->>'priorite', '')::smallint,
      v_statut,
      nullif(v_ligne->>'echeance', '')::date,
      nullif(v_ligne->>'contexte', ''),
      nullif(v_ligne->>'note', ''),
      v_projet,
      v_batch,
      -- La contrainte tasks_done_at_coherent impose l'équivalence entre
      -- « statut = fait » et « done_at renseigné ».
      case when v_statut = 'fait' then now() end
    );

    v_taches := v_taches + 1;
  end loop;

  return query select v_batch, v_taches, v_projets;
end $$;

-- Annuler un lot. Les projets créés au passage sont conservés : ils peuvent
-- déjà porter d'autres tâches, et supprimer un projet en cascade emporterait
-- du travail qui n'était pas dans le lot.
create or replace function public.annuler_import(p_batch uuid)
returns integer
language plpgsql as $$
declare
  v_supprimees integer;
begin
  delete from public.tasks where import_batch_id = p_batch;
  get diagnostics v_supprimees = row_count;
  delete from public.import_batches where id = p_batch;
  return v_supprimees;
end $$;

-- 0009 a déjà révoqué les droits d'anon et authenticated, et les privilèges
-- par défaut du schéma couvrent ces deux fonctions. Rien à ajouter.
