import { notFound } from 'next/navigation'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget } from '@/components/ui/Widget'
import { BoutonPrincipal, Champ, Saisie, Zone } from '@/components/ui/Champ'
import { detailNote } from '@/lib/donnees/vie'
import { enregistrerNoteEtRevenir, supprimerNote } from '@/lib/actions/vie'
import { jourDe, jourRelatif } from '@/lib/date'

export const metadata = { title: 'Note' }

export default async function PageNote({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const note = await detailNote(id)
  if (!note) notFound()

  return (
    <>
      <EnTeteSection titre={note.titre || '(sans titre)'} retour="/notes" />

      <Widget
        libelle="Modifier"
        action={
          <span className="text-11 text-secondaire">
            {jourRelatif(jourDe(note.modifieeLe))}
          </span>
        }
      >
        <form action={enregistrerNoteEtRevenir}>
          <input type="hidden" name="id" value={note.id} />

          <Champ libelle="Titre">
            <Saisie name="titre" defaultValue={note.titre} autoComplete="off" />
          </Champ>
          <Champ libelle="Contenu">
            <Zone name="contenu" rows={14} defaultValue={note.contenu} />
          </Champ>
          <Champ libelle="Tags" aide="Séparés par des virgules.">
            <Saisie name="tags" defaultValue={note.tags.join(', ')} autoComplete="off" />
          </Champ>

          <div className="mt-4">
            <BoutonPrincipal type="submit">Enregistrer</BoutonPrincipal>
          </div>
        </form>

        <form action={supprimerNote.bind(null, note.id)} className="mt-6">
          <button type="submit" className="cible text-13 text-secondaire underline">
            Supprimer la note
          </button>
        </form>
      </Widget>
    </>
  )
}
