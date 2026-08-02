'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BoutonPrincipal, Champ, Menu, Saisie, Zone } from '@/components/ui/Champ'
import { Widget } from '@/components/ui/Widget'
import { centsDepuisTexte, euros } from '@/lib/argent'
import { aujourdhui } from '@/lib/date'
import {
  enregistrerAjustement,
  type ResultatAjustement,
} from '@/lib/actions/finances'
import type { Compte } from '@/lib/donnees/finances'

/**
 * Le rapprochement de solde.
 *
 * On lit le solde réel sur l'application bancaire, on le tape ici, et
 * l'application crée l'écriture d'écart. Jamais de correction silencieuse : un
 * solde qui change tout seul est un solde auquel on cesse de croire.
 *
 * Trois choses rendent le geste sûr :
 *
 *   — le solde calculé est réaffiché au-dessus du champ, donc on compare avant
 *     de valider plutôt qu'après ;
 *   — l'écart s'affiche pendant la saisie, ce qui rattrape la virgule mal
 *     placée avant l'envoi ;
 *   — au-delà de 100 €, une seconde confirmation, parce qu'un écart de cet
 *     ordre est presque toujours une faute de frappe et presque jamais la
 *     réalité.
 *
 * L'écart affiché ici reste indicatif : c'est le serveur qui recalcule, dans
 * la même transaction que l'insertion, et c'est son chiffre qui s'affiche
 * ensuite.
 */

const SEUIL_CONFIRMATION_CENTS = 10_000

export function FormulaireAjustement({ comptes }: { comptes: Compte[] }) {
  const routeur = useRouter()
  const [enCours, demarrer] = useTransition()

  const [compteId, setCompteId] = useState(comptes[0]?.id ?? '')
  const [saisie, setSaisie] = useState('')
  const [date, setDate] = useState(aujourdhui())
  const [note, setNote] = useState('')
  const [confirme, setConfirme] = useState(false)
  const [resultat, setResultat] = useState<ResultatAjustement | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const compte = comptes.find((c) => c.id === compteId) ?? null
  const reelCents = centsDepuisTexte(saisie)

  // Le rapprochement se fait à la date de l'ajustement, donc c'est le solde
  // pointé — arrêté à aujourd'hui — qui sert de référence, pas le solde total
  // qui inclurait un loyer post-daté.
  const calculeCents = compte?.soldePointeCents ?? 0
  const ecartCents = reelCents === null ? null : reelCents - calculeCents
  const grosEcart = ecartCents !== null && Math.abs(ecartCents) > SEUIL_CONFIRMATION_CENTS

  const envoyer = () => {
    if (!compte || reelCents === null) {
      setErreur('Montant illisible. Exemple : 1234,56')
      return
    }
    if (grosEcart && !confirme) {
      setConfirme(true)
      return
    }

    setErreur(null)
    demarrer(async () => {
      try {
        const retour = await enregistrerAjustement({
          compteId: compte.id,
          soldeReelCents: reelCents,
          date,
          note,
        })
        setResultat(retour)
        setConfirme(false)
        routeur.refresh()
      } catch (souci) {
        setErreur(souci instanceof Error ? souci.message : 'Le rapprochement a échoué.')
      }
    })
  }

  if (resultat) {
    return (
      <Widget libelle="Rapprochement">
        {resultat.ecartCents === 0 ? (
          <>
            <p className="text-24">Déjà à jour.</p>
            <p className="mt-2 text-13 text-secondaire">
              Le solde calculé correspond exactement au solde saisi. Aucune écriture
              n&apos;a été créée.
            </p>
          </>
        ) : (
          <>
            <p className="chiffres text-40 leading-none">
              {resultat.ecartCents > 0 ? '+' : ''}
              {euros(resultat.ecartCents)}
            </p>
            <p className="mt-2 text-13 text-secondaire">
              Écriture d&apos;ajustement créée. Le solde calculé était de{' '}
              <span className="chiffres">{euros(resultat.calculeCents)}</span>, il vaut
              maintenant <span className="chiffres">{euros(reelCents ?? 0)}</span>.
            </p>
            <p className="mt-2 text-11 text-secondaire">
              Les ajustements comptent dans le solde mais sont exclus du net mensuel :
              une correction de mesure n&apos;est pas un événement économique.
            </p>
          </>
        )}

        <button
          type="button"
          onClick={() => {
            setResultat(null)
            setSaisie('')
          }}
          className="cible mt-6 text-13 underline"
        >
          Rapprocher un autre compte
        </button>
      </Widget>
    )
  }

  return (
    <Widget libelle="Rapprocher un compte">
      {erreur ? (
        <p role="alert" className="mb-3 text-13">
          {erreur}
        </p>
      ) : null}

      <Champ libelle="Compte">
        <Menu
          value={compteId}
          onChange={(e) => {
            setCompteId(e.target.value)
            setConfirme(false)
          }}
        >
          {comptes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </Menu>
      </Champ>

      {/* Le solde calculé, juste au-dessus du champ : on compare avant de
          valider, pas après. */}
      <div className="flex items-baseline justify-between gap-4 border-b border-trait py-3">
        <span className="libelle">Solde calculé</span>
        <span className="chiffres text-18">{euros(calculeCents)}</span>
      </div>

      <Champ libelle="Solde réel lu sur la banque">
        <Saisie
          inputMode="decimal"
          value={saisie}
          onChange={(e) => {
            setSaisie(e.target.value)
            setConfirme(false)
          }}
          placeholder="1234,56"
          autoComplete="off"
        />
      </Champ>

      <div className="flex items-baseline justify-between gap-4 border-b border-trait py-3">
        <span className="libelle">Écart</span>
        <span className="chiffres text-18">
          {ecartCents === null
            ? '—'
            : `${ecartCents > 0 ? '+' : ''}${euros(ecartCents)}`}
        </span>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Champ libelle="Date">
            <Saisie type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Champ>
        </div>
      </div>

      <Champ libelle="Note">
        <Zone rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Champ>

      {confirme ? (
        <p role="alert" className="mt-4 rounded-petit bg-important-fond p-3 text-13 text-important">
          L&apos;écart dépasse 100 €. C&apos;est presque toujours une faute de frappe.
          Toucher à nouveau pour confirmer la création de l&apos;écriture.
        </p>
      ) : null}

      <div className="mt-6">
        <BoutonPrincipal
          type="button"
          onClick={envoyer}
          disabled={enCours || reelCents === null || ecartCents === null}
        >
          {enCours
            ? 'Enregistrement…'
            : confirme
              ? `Confirmer l'écart de ${euros(ecartCents ?? 0)}`
              : 'Rapprocher'}
        </BoutonPrincipal>
      </div>
    </Widget>
  )
}
