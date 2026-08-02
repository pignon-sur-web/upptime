import Link from 'next/link'
import type { Route } from 'next'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Carte } from '@/components/ui/Carte'
import { BarreFiltres, Pilule } from '@/components/ui/Pilule'
import { Invitation, Widget } from '@/components/ui/Widget'
import { BoutonPrincipal, Champ, Saisie, Zone } from '@/components/ui/Champ'
import { chercherNotes, tagsDeNotes } from '@/lib/donnees/vie'
import { enregistrerNote } from '@/lib/actions/vie'
import { jourDe, jourRelatif } from '@/lib/date'

export const metadata = { title: 'Notes' }

export default async function PageNotes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>
}) {
  const { q, tag } = await searchParams
  const [notes, tags] = await Promise.all([chercherNotes(q, tag), tagsDeNotes()])

  return (
    <>
      <EnTeteSection titre="Notes" />

      {/*
        La recherche est un formulaire GET : l'état vit dans l'URL, l'écran
        fonctionne sans JavaScript, et un résultat se partage ou se met en
        favori. La requête part en `websearch_to_tsquery` sur la configuration
        française sans accents — chercher « resume » trouve « résumé ».
      */}
      <Carte>
        <form method="get" className="flex items-center gap-2">
          <Saisie
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Chercher — resume trouve résumé"
            aria-label="Chercher dans les notes"
          />
          {tag ? <input type="hidden" name="tag" value={tag} /> : null}
          <button type="submit" className="cible shrink-0 px-2 text-13 underline">
            Chercher
          </button>
        </form>
      </Carte>

      {tags.length > 0 ? (
        <BarreFiltres libelle="Étiquettes">
          {tag ? (
            <Pilule
              href={q ? (`/notes?q=${encodeURIComponent(q)}` as Route) : '/notes'}
              actif
            >
              {tag} ×
            </Pilule>
          ) : (
            tags.slice(0, 12).map(({ tag: nom, nb }) => (
              <Pilule
                key={nom}
                href={
                  (q
                    ? `/notes?q=${encodeURIComponent(q)}&tag=${encodeURIComponent(nom)}`
                    : `/notes?tag=${encodeURIComponent(nom)}`) as Route
                }
                actif={false}
              >
                {nom} <span className="chiffres text-11">{nb}</span>
              </Pilule>
            ))
          )}
        </BarreFiltres>
      ) : null}

      <Widget
        libelle={q || tag ? 'Résultats' : 'Toutes les notes'}
        action={<span className="chiffres text-13">{notes.length}</span>}
      >
        {notes.length === 0 ? (
          <Invitation>
            {q || tag
              ? 'Aucune note ne correspond.'
              : "Aucune note. Le champ ci-dessous en crée une d'un geste."}
          </Invitation>
        ) : (
          <ul>
            {notes.map((note) => (
              <li key={note.id} className="border-b border-trait last:border-b-0">
                <Link href={`/notes/${note.id}`} className="block py-2">
                  <span className="block truncate text-15">
                    {note.titre || '(sans titre)'}
                  </span>
                  <span className="block truncate text-13 text-secondaire">
                    {note.contenu.split('\n')[0] || '—'}
                  </span>
                  <span className="mt-0.5 block text-11 text-secondaire">
                    {jourRelatif(jourDe(note.modifieeLe))}
                    {note.tags.length > 0 ? ` · ${note.tags.join(', ')}` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Widget>

      <Widget libelle="Nouvelle note">
        <form action={enregistrerNote}>
          <Champ libelle="Titre">
            <Saisie name="titre" autoComplete="off" />
          </Champ>
          <Champ libelle="Contenu">
            <Zone name="contenu" rows={5} />
          </Champ>
          <Champ libelle="Tags" aide="Séparés par des virgules.">
            <Saisie name="tags" autoComplete="off" placeholder="idée, client, lecture" />
          </Champ>
          <div className="mt-4">
            <BoutonPrincipal type="submit">Créer la note</BoutonPrincipal>
          </div>
        </form>
      </Widget>
    </>
  )
}
