'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  analyser,
  devinerAssociation,
  devinerFormatDate,
  devinerSeparateur,
  preparer,
  CHAMPS_CIBLES,
  type ChampCible,
  type FormatDate,
  type Separateur,
} from '@/lib/csv'
import { annulerImport, importerTaches, type ResultatImport } from '@/lib/actions/import'
import { Widget } from '@/components/ui/Widget'

const SEPARATEURS: { valeur: Separateur; nom: string }[] = [
  { valeur: ';', nom: 'point-virgule' },
  { valeur: ',', nom: 'virgule' },
  { valeur: '\t', nom: 'tabulation' },
]

const FORMATS: FormatDate[] = ['JJ/MM/AAAA', 'MM/JJ/AAAA', 'AAAA-MM-JJ']

/**
 * Import CSV en quatre étapes : dépôt, association, aperçu, import.
 *
 * Toute l'analyse se fait dans le navigateur, donc l'aperçu est instantané et
 * **rien n'est écrit tant qu'on n'a pas cliqué**. C'est ce qui permet de
 * tâtonner sur l'association des colonnes sans conséquence.
 */
export function Import() {
  const [texte, setTexte] = useState('')
  const [nomFichier, setNomFichier] = useState<string | null>(null)
  const [separateur, setSeparateur] = useState<Separateur | null>(null)
  const [avecEntete, setAvecEntete] = useState(true)
  const [association, setAssociation] = useState<Partial<Record<ChampCible, number>>>({})
  const [formatDate, setFormatDate] = useState<FormatDate>('JJ/MM/AAAA')
  const [resultat, setResultat] = useState<ResultatImport | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, demarrer] = useTransition()

  const sep = separateur ?? (texte ? devinerSeparateur(texte) : ';')
  const lignes = useMemo(() => (texte ? analyser(texte, sep) : []), [texte, sep])
  const entetes = avecEntete ? (lignes[0] ?? []) : (lignes[0] ?? []).map((_, i) => `Colonne ${i + 1}`)

  const prepares = useMemo(
    () => (lignes.length > 0 ? preparer(lignes, association, formatDate, avecEntete) : []),
    [lignes, association, formatDate, avecEntete],
  )

  const valides = prepares.filter((l) => l.erreur === null)
  const fautives = prepares.filter((l) => l.erreur !== null)

  /** Charge un contenu et pré-remplit tout ce qui peut l'être. */
  const charger = (contenu: string, nom: string | null) => {
    const separateurDevine = devinerSeparateur(contenu)
    const analysees = analyser(contenu, separateurDevine)
    const premiere = analysees[0] ?? []
    const propositions = devinerAssociation(premiere)

    setTexte(contenu)
    setNomFichier(nom)
    setSeparateur(separateurDevine)
    setAssociation(propositions)
    setResultat(null)
    setErreur(null)

    // Deviner le format de date sur la vraie colonne d'échéance, si trouvée.
    const colonneDate = propositions.echeance
    if (colonneDate !== undefined) {
      const valeurs = analysees.slice(1, 60).map((l) => l[colonneDate] ?? '')
      setFormatDate(devinerFormatDate(valeurs))
    }
  }

  if (resultat) {
    return (
      <Widget libelle="Import terminé">
        <p className="text-15">
          <span className="chiffres">{resultat.tachesCreees}</span> tâches créées
          {resultat.projetsCrees > 0 ? (
            <>
              , <span className="chiffres">{resultat.projetsCrees}</span> projets
            </>
          ) : null}
          {resultat.ignorees > 0 ? (
            <>
              , <span className="chiffres">{resultat.ignorees}</span> lignes ignorées
            </>
          ) : null}
          .
        </p>

        <button
          type="button"
          disabled={enCours}
          onClick={() =>
            demarrer(async () => {
              await annulerImport(resultat.batchId)
              setResultat(null)
              setTexte('')
              setNomFichier(null)
            })
          }
          className="cible mt-4 w-full border border-trait text-13"
        >
          {enCours ? 'Annulation…' : 'Annuler cet import'}
        </button>
        <p className="mt-2 text-11 text-secondaire">
          Annuler retire les {resultat.tachesCreees} tâches et les projets créés
          au passage restés vides.
        </p>
      </Widget>
    )
  }

  return (
    <>
      <Widget libelle="1 — Le fichier">
        <label
          htmlFor="fichier"
          className="cible flex w-full items-center justify-center border border-trait text-13"
        >
          Choisir un fichier CSV
        </label>
        <input
          id="fichier"
          type="file"
          accept=".csv,.tsv,.txt,text/csv"
          className="sr-only"
          onChange={async (e) => {
            const fichier = e.target.files?.[0]
            if (!fichier) return
            charger(await fichier.text(), fichier.name)
          }}
        />

        <p className="mt-3 libelle">ou collez le contenu</p>
        <textarea
          rows={4}
          value={nomFichier ? '' : texte}
          onChange={(e) => charger(e.target.value, null)}
          placeholder={'Titre;Échéance;Priorité\nAppeler le comptable;15/09/2026;1'}
          className="mt-1 w-full border border-trait bg-fond p-3 outline-none focus:border-texte"
        />

        {nomFichier ? (
          <p className="mt-2 text-13 text-secondaire">{nomFichier}</p>
        ) : null}
      </Widget>

      {lignes.length > 0 ? (
        <>
          <Widget libelle="2 — Les colonnes">
            <div className="flex items-center justify-between gap-4 border-b border-trait py-2">
              <span className="text-13">Séparateur</span>
              <select
                value={sep}
                onChange={(e) => setSeparateur(e.target.value as Separateur)}
                className="h-11 border border-trait bg-fond px-2"
              >
                {SEPARATEURS.map((s) => (
                  <option key={s.valeur} value={s.valeur}>
                    {s.nom}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cible items-center justify-between gap-4 border-b border-trait">
              <span className="text-13">La première ligne est un en-tête</span>
              <input
                type="checkbox"
                checked={avecEntete}
                onChange={(e) => setAvecEntete(e.target.checked)}
                className="size-5"
              />
            </label>

            <div className="flex items-center justify-between gap-4 border-b border-trait py-2">
              <span className="text-13">
                Format des dates
                {/* Deviner ligne par ligne serait pire que demander : 03/04
                    est valide dans les deux sens, et se tromper sur deux cents
                    lignes ne se rattrape pas. */}
              </span>
              <select
                value={formatDate}
                onChange={(e) => setFormatDate(e.target.value as FormatDate)}
                className="chiffres h-11 border border-trait bg-fond px-2"
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {CHAMPS_CIBLES.map((champ) => (
              <div
                key={champ.cle}
                className="flex items-center justify-between gap-4 border-b border-trait py-2 last:border-b-0"
              >
                <span className="text-13">
                  {champ.nom}
                  {champ.requis ? <span aria-label="obligatoire"> *</span> : null}
                </span>
                <select
                  value={association[champ.cle] ?? ''}
                  onChange={(e) =>
                    setAssociation((a) => ({
                      ...a,
                      [champ.cle]: e.target.value === '' ? undefined : Number(e.target.value),
                    }))
                  }
                  className="h-11 max-w-[55%] border border-trait bg-fond px-2"
                >
                  <option value="">—</option>
                  {entetes.map((entete, i) => (
                    <option key={i} value={i}>
                      {entete || `Colonne ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </Widget>

          <Widget
            libelle="3 — Aperçu"
            action={
              <span className="chiffres text-13">
                {valides.length} / {prepares.length}
              </span>
            }
          >
            {association.titre === undefined ? (
              <p className="text-13">
                Associez d&apos;abord la colonne du titre : c&apos;est le seul
                champ obligatoire.
              </p>
            ) : (
              <>
                <ul>
                  {valides.slice(0, 10).map((ligne) => (
                    <li key={ligne.numero} className="border-b border-trait py-2 last:border-b-0">
                      <span className="block text-13">{ligne.titre}</span>
                      <span className="flex flex-wrap gap-x-3 text-11 text-secondaire">
                        {ligne.echeance ? (
                          <span className="chiffres">{ligne.echeance}</span>
                        ) : null}
                        {ligne.priorite ? <span className="chiffres">P{ligne.priorite}</span> : null}
                        {ligne.projet ? <span>{ligne.projet}</span> : null}
                        {ligne.statut === 'fait' ? <span>fait</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>

                {fautives.length > 0 ? (
                  <div className="mt-3 border-l-2 border-l-texte pl-3">
                    <p className="text-13">
                      <span className="chiffres">{fautives.length}</span> lignes
                      seront ignorées :
                    </p>
                    <ul className="mt-1">
                      {fautives.slice(0, 5).map((ligne) => (
                        <li key={ligne.numero} className="text-11 text-secondaire">
                          ligne <span className="chiffres">{ligne.numero}</span> — {ligne.erreur}
                        </li>
                      ))}
                      {fautives.length > 5 ? (
                        <li className="text-11 text-secondaire">…</li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </Widget>

          <Widget libelle="4 — Importer">
            {erreur ? (
              <p role="alert" className="mb-3 text-13">
                {erreur}
              </p>
            ) : null}

            <button
              type="button"
              disabled={enCours || valides.length === 0}
              onClick={() =>
                demarrer(async () => {
                  try {
                    setErreur(null)
                    setResultat(await importerTaches(prepares, nomFichier))
                  } catch (e) {
                    setErreur(e instanceof Error ? e.message : "L'import a échoué.")
                  }
                })
              }
              className="transition-etat h-12 w-full border border-texte bg-texte text-15 text-fond disabled:opacity-40"
            >
              {enCours
                ? 'Import…'
                : `Importer ${valides.length} tâche${valides.length > 1 ? 's' : ''}`}
            </button>

            <p className="mt-2 text-11 text-secondaire">
              L&apos;import se défait d&apos;une tape juste après, s&apos;il ne
              donne pas ce que vous attendiez.
            </p>
          </Widget>
        </>
      ) : null}
    </>
  )
}
