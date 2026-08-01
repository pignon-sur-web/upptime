'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BoutonPrincipal, Champ, Menu, Saisie } from '@/components/ui/Champ'
import { enregistrerEcriture } from '@/lib/actions/finances'
import { aujourdhui } from '@/lib/date'

/**
 * La saisie rapide, et c'est le geste qui décide si l'application sert.
 *
 * Trois champs visibles — montant, libellé, nature — et le reste replié.
 * Saisir une dépense au comptoir doit prendre cinq secondes ; si ça en prend
 * vingt, on ne le fait pas, et un mois plus tard le solde ne veut plus rien
 * dire.
 *
 * Le formulaire se vide et rend le focus au montant après l'envoi : on saisit
 * souvent trois dépenses d'affilée en vidant ses tickets.
 */
export function SaisieRapide({
  comptes,
  categories,
}: {
  comptes: readonly { id: string; nom: string }[]
  categories: readonly string[]
}) {
  const routeur = useRouter()
  const [enCours, demarrer] = useTransition()
  const [erreur, setErreur] = useState<string | null>(null)
  const [detaille, setDetaille] = useState(false)
  const formulaire = useRef<HTMLFormElement>(null)
  const montant = useRef<HTMLInputElement>(null)

  if (comptes.length === 0) return null

  const envoyer = (donnees: FormData) => {
    setErreur(null)
    demarrer(async () => {
      try {
        await enregistrerEcriture(donnees)
        formulaire.current?.reset()
        montant.current?.focus()
        routeur.refresh()
      } catch (souci) {
        setErreur(souci instanceof Error ? souci.message : "L'écriture a échoué.")
      }
    })
  }

  return (
    <form ref={formulaire} action={envoyer}>
      {erreur ? (
        <p role="alert" className="mb-2 text-13">
          {erreur}
        </p>
      ) : null}

      <div className="flex gap-4">
        <div className="flex-1">
          <Champ libelle="Montant">
            <Saisie
              ref={montant}
              name="montant"
              inputMode="decimal"
              required
              placeholder="19,99"
              autoComplete="off"
            />
          </Champ>
        </div>
        <div className="flex-1">
          <Champ libelle="Nature">
            {/* Le signe n'est jamais demandé : il découle de la nature. */}
            <Menu name="nature" defaultValue="depense">
              <option value="depense">Dépense</option>
              <option value="revenu">Revenu</option>
            </Menu>
          </Champ>
        </div>
      </div>

      <Champ libelle="Libellé">
        <Saisie name="libelle" required autoComplete="off" placeholder="Courses" />
      </Champ>

      <div className="flex gap-4">
        <div className="flex-1">
          <Champ libelle="Compte">
            <Menu name="compte" defaultValue={comptes[0]?.id}>
              {comptes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </Menu>
          </Champ>
        </div>
        <div className="flex-1">
          <Champ libelle="Catégorie">
            <Saisie
              name="categorie"
              list="categories-connues"
              autoComplete="off"
              placeholder="Courses"
            />
            <datalist id="categories-connues">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Champ>
        </div>
      </div>

      {detaille ? (
        <Champ libelle="Date">
          <Saisie type="date" name="date" defaultValue={aujourdhui()} />
        </Champ>
      ) : (
        <input type="hidden" name="date" value={aujourdhui()} />
      )}

      <div className="mt-4">
        <BoutonPrincipal type="submit" disabled={enCours}>
          {enCours ? 'Enregistrement…' : 'Enregistrer'}
        </BoutonPrincipal>
      </div>

      {!detaille ? (
        <button
          type="button"
          onClick={() => setDetaille(true)}
          className="cible mt-1 text-13 text-secondaire underline"
        >
          Changer la date
        </button>
      ) : null}
    </form>
  )
}
