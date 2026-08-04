import { notFound } from 'next/navigation'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget } from '@/components/ui/Widget'
import { majNote, supprimerNote } from '@/lib/actions/vie'
import { notes as toutesNotes } from '@/lib/donnees/vie'

export const metadata = { title: 'Note' }

export default async function PageNote({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const note = (await toutesNotes(500)).find((n) => n.id === id)
  if (!note) notFound()

  return (
    <>
      <EnTeteSection titre={note.titre || 'Sans titre'} retour="/notes" />
      <Widget libelle="La note">
        <form action={majNote.bind(null, note.id)}>
          <input
            name="titre"
            defaultValue={note.titre}
            maxLength={160}
            aria-label="Titre"
            className="h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
          />
          <textarea
            name="contenu"
            rows={14}
            defaultValue={note.contenu}
            aria-label="Contenu"
            className="mt-2 w-full border border-trait bg-fond p-3 outline-none focus:border-texte"
          />
          <input
            name="tags"
            defaultValue={note.tags.join(', ')}
            maxLength={160}
            aria-label="Tags"
            className="mt-2 h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
          />
          <button
            type="submit"
            className="transition-etat mt-3 h-12 w-full border border-texte bg-texte text-15 text-fond"
          >
            Enregistrer
          </button>
        </form>

        <form action={supprimerNote.bind(null, note.id)} className="mt-6 border-t border-trait pt-4">
          <button type="submit" className="cible w-full text-13 text-secondaire">
            Supprimer cette note
          </button>
        </form>
      </Widget>
    </>
  )
}
