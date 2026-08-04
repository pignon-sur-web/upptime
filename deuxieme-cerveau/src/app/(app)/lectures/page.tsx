import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget, Invitation } from '@/components/ui/Widget'
import { CarteLivre } from '@/components/vie/CarteLivre'
import { creerLivre } from '@/lib/actions/vie'
import { livres as tousLivres } from '@/lib/donnees/vie'

export const metadata = { title: 'Lectures' }

const GROUPES = [
  { statut: 'en_cours', nom: 'En cours' },
  { statut: 'a_lire', nom: 'À lire' },
  { statut: 'lu', nom: 'Lus' },
  { statut: 'abandonne', nom: 'Abandonnés' },
] as const

export default async function PageLectures() {
  const livres = await tousLivres()

  return (
    <>
      <EnTeteSection titre="Lectures" />

      {GROUPES.map((groupe) => {
        const dedans = livres.filter((l) => l.statut === groupe.statut)
        if (dedans.length === 0 && groupe.statut !== 'en_cours') return null

        return (
          <Widget key={groupe.statut} libelle={`${groupe.nom} — ${dedans.length}`}>
            {dedans.length === 0 ? (
              <Invitation>Aucune lecture en cours.</Invitation>
            ) : (
              <ul className="grid grid-cols-3 gap-4">
                {dedans.map((livre) => (
                  <CarteLivre key={livre.id} livre={livre} />
                ))}
              </ul>
            )}
          </Widget>
        )
      })}

      <Widget libelle="Ajouter un livre">
        <form action={creerLivre}>
          <input
            name="titre"
            required
            maxLength={200}
            aria-label="Titre"
            placeholder="Titre"
            className="h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
          />
          <div className="mt-2 flex gap-2">
            <input
              name="auteur"
              maxLength={120}
              aria-label="Auteur"
              placeholder="Auteur"
              className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            />
            <select
              name="statut"
              defaultValue="a_lire"
              aria-label="Statut"
              className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            >
              <option value="a_lire">À lire</option>
              <option value="en_cours">En cours</option>
              <option value="lu">Lu</option>
            </select>
          </div>
          <button
            type="submit"
            className="transition-etat mt-3 h-12 w-full border border-texte bg-texte text-15 text-fond"
          >
            Ajouter
          </button>
        </form>
      </Widget>
    </>
  )
}
