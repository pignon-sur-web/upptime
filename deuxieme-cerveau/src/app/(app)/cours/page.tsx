import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget, Invitation } from '@/components/ui/Widget'
import { LigneCours } from '@/components/vie/LigneCours'
import { creerCours } from '@/lib/actions/vie'
import { cours as tousCours } from '@/lib/donnees/vie'

export const metadata = { title: 'Cours' }

export default async function PageCours() {
  const cours = await tousCours()

  return (
    <>
      <EnTeteSection titre="Cours" />

      <Widget libelle={`Suivis — ${cours.length}`}>
        {cours.length === 0 ? (
          <Invitation>Aucun cours enregistré.</Invitation>
        ) : (
          <ul>
            {cours.map((c) => (
              <LigneCours key={c.id} cours={c} />
            ))}
          </ul>
        )}
      </Widget>

      <Widget libelle="Ajouter">
        <form action={creerCours}>
          <input
            name="nom"
            required
            maxLength={160}
            aria-label="Nom"
            placeholder="Nom du cours"
            className="h-12 w-full border border-trait bg-fond px-3 outline-none focus:border-texte"
          />
          <div className="mt-2 flex gap-2">
            <input
              name="matiere"
              maxLength={80}
              aria-label="Matière"
              placeholder="Matière"
              className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            />
            <input
              name="lien"
              type="url"
              aria-label="Lien"
              placeholder="https://…"
              className="h-12 min-w-0 flex-1 border border-trait bg-fond px-3 outline-none focus:border-texte"
            />
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
