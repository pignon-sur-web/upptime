'use client'

import { useState, useTransition } from 'react'
import { rapprocherSolde, type ResultatAjustement } from '@/lib/actions/finances'
import { formater, formaterSigne, versCents } from '@/lib/argent'

/** Au-delà de cet écart, on demande une seconde confirmation. */
const SEUIL_CONFIRMATION = 10_000 // 100 €

/**
 * Rapprochement de solde.
 *
 * On lit le solde réel sur son application bancaire, on le tape ici, et
 * l'application crée une écriture d'écart datée. **Jamais de correction
 * silencieuse** : l'écart est une ligne du grand livre comme une autre, qu'on
 * peut retrouver et compter.
 *
 * L'écart affiché pendant la saisie n'est qu'un aperçu calculé sur le solde
 * rendu par le serveur au chargement. C'est le serveur qui recalcule et fait
 * foi ; si une écriture est arrivée entre-temps, c'est son chiffre qui
 * s'affiche à l'arrivée, pas l'aperçu.
 */
export function Rapprochement({
  compteId,
  compteNom,
  calculeCents,
}: {
  compteId: string
  compteNom: string
  calculeCents: number
}) {
  const [saisie, setSaisie] = useState('')
  const [resultat, setResultat] = useState<ResultatAjustement | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [confirme, setConfirme] = useState(false)
  const [enCours, demarrer] = useTransition()

  const reel = versCents(saisie)
  const apercu = reel === null ? null : reel - calculeCents
  const gros = apercu !== null && Math.abs(apercu) > SEUIL_CONFIRMATION

  if (resultat) {
    return (
      <>
        {resultat.creee ? (
          <>
            <p className="text-15">
              Écart de{' '}
              <span className="chiffres">{formaterSigne(resultat.ecartCents)}</span>{' '}
              enregistré.
            </p>
            <p className="mt-2 text-13 text-secondaire">
              Une écriture d&apos;ajustement datée d&apos;aujourd&apos;hui a été
              créée sur {compteNom}. Elle apparaît dans le relevé avec un ≠ et
              n&apos;est pas modifiable.
            </p>
          </>
        ) : (
          <p className="text-15">Déjà à jour. Aucune écriture créée.</p>
        )}
      </>
    )
  }

  return (
    <>
      <p className="libelle">Solde calculé</p>
      <p className="chiffres text-24">{formater(calculeCents)}</p>

      <label htmlFor="reel" className="libelle mt-4 block">
        Solde réel lu sur votre banque
      </label>
      <input
        id="reel"
        inputMode="decimal"
        value={saisie}
        onChange={(e) => {
          setSaisie(e.target.value)
          setConfirme(false)
        }}
        placeholder="0,00"
        className="chiffres mt-1 h-14 w-full border border-trait bg-fond px-3 text-24 outline-none focus:border-texte"
      />

      {apercu !== null ? (
        <p className="mt-3 flex items-baseline justify-between gap-4">
          <span className="libelle">Écart</span>
          <span className="chiffres text-18">{formaterSigne(apercu)}</span>
        </p>
      ) : null}

      {apercu === 0 ? (
        <p className="mt-2 text-13 text-secondaire">
          Rien à corriger : aucune écriture ne sera créée.
        </p>
      ) : null}

      {gros && !confirme ? (
        <>
          <p className="mt-3 border-l-2 border-l-texte pl-3 text-13">
            L&apos;écart dépasse 100 €. Vérifiez le montant avant de valider.
          </p>
          <button
            type="button"
            onClick={() => setConfirme(true)}
            className="cible mt-2 w-full border border-trait text-13"
          >
            J&apos;ai vérifié : {formaterSigne(apercu)}
          </button>
        </>
      ) : null}

      {erreur ? (
        <p role="alert" className="mt-3 text-13">
          {erreur}
        </p>
      ) : null}

      <button
        type="button"
        disabled={enCours || reel === null || (gros && !confirme)}
        onClick={() =>
          demarrer(async () => {
            try {
              setErreur(null)
              setResultat(await rapprocherSolde(compteId, saisie))
            } catch (e) {
              setErreur(e instanceof Error ? e.message : 'Le rapprochement a échoué.')
            }
          })
        }
        className="transition-etat mt-4 h-12 w-full border border-texte bg-texte text-15 text-fond disabled:opacity-40"
      >
        {enCours ? 'Rapprochement…' : 'Rapprocher'}
      </button>
    </>
  )
}
