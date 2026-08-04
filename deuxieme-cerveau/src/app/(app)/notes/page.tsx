import Link from 'next/link'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget, Invitation } from '@/components/ui/Widget'
import { creerNote } from '@/lib/actions/vie'
import { chercherNotes } from '@/lib/donnees/vie'

export const metadata = { title: 'Notes' }

export default async function PageNotes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const question = (q ?? '').trim()
  const notes = await chercherNotes(question)

  return (
    <>
      <EnTeteSection titre="Notes" />

      {/* La recherche passe par websearch_to_tsquery sur une configuration
          française sans accents : « resume » trouve « résumé », et les
          exclusions en -mot fonctionnent. */}
      <form method="get" className="flex gap-2 border-b border-trait px-5 py-4">
        <input
          name="q"
          defaultValue={question}
          type="search"
          aria-label="Rechercher"
          placeholder="Rechercher…"
          className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
        />
        <button type="submit" className="cible w-24 border border-trait text-13">
          Chercher
        </button>
      </form>

      <Widget
        libelle={question ? `Résultats — ${notes.length}` : `Toutes — ${notes.length}`}
      >
        {notes.length === 0 ? (
          <Invitation>
            {question ? 'Aucune note ne correspond.' : 'Aucune note pour le moment.'}
          </Invitation>
        ) : (
          <ul>
            {notes.map((note) => (
              <li key={note.id} className="border-b border-trait last:border-b-0">
                <Link href={`/notes/${note.id}`} className="cible block py-2">
                  <span className="block truncate text-15">{note.titre || 'Sans titre'}</span>
                  <span className="block truncate text-11 text-secondaire">
                    {note.contenu.slice(0, 120)}
                  </span>
                  {note.tags.length > 0 ? (
                    <span className="block text-11 text-secondaire">
                      {note.tags.map((t) => `#${t}`).join(' ')}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Widget>

      <Widget libelle="Nouvelle note">
        <form action={creerNote}>
          <input
            name="titre"
            maxLength={160}
            aria-label="Titre"
            placeholder="Titre (facultatif)"
            className="h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
          />
          <textarea
            name="contenu"
            rows={6}
            aria-label="Contenu"
            placeholder="Markdown accepté"
            className="mt-2 w-full border border-trait bg-fond p-3 outline-none focus:border-texte"
          />
          <input
            name="tags"
            maxLength={160}
            aria-label="Tags"
            placeholder="Tags, séparés par des virgules"
            className="mt-2 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
          />
          <button
            type="submit"
            className="transition-etat mt-3 h-12 w-full border border-texte bg-texte text-15 text-fond"
          >
            Créer
          </button>
        </form>
      </Widget>
    </>
  )
}
