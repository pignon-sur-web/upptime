'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BoutonPrincipal, Champ, Menu, Zone } from '@/components/ui/Champ'
import { Carte } from '@/components/ui/Carte'
import { Widget } from '@/components/ui/Widget'
import {
  analyserCSV,
  associerEntetes,
  CHAMPS_IMPORT,
  detecterFormatDate,
  detecterSeparateur,
  FORMATS_DATE,
  preparerLignes,
  ressembleAUnEntete,
  SEPARATEURS,
  type Association,
  type ChampImport,
  type FormatDate,
  type Separateur,
} from '@/lib/csv'
import { jourRelatif } from '@/lib/date'
import { LIBELLE_PRIORITE, LIBELLE_STATUT_TACHE, type Priorite } from '@/lib/enums'
import { annulerImport, importerTaches, type ResultatImport } from '@/lib/actions/import'

/**
 * L'assistant d'import, en quatre étapes.
 *
 * Tout le travail d'analyse a lieu ici, dans le navigateur : le fichier ne
 * part pas tant que l'aperçu n'a pas été validé, et l'aperçu affiche
 * exactement ce que le serveur recalculera. Le serveur ne fait jamais
 * confiance à ce qui lui est envoyé — il reçoit le texte brut et les
 * décisions, pas les lignes déjà transformées.
 *
 * Le seul écran de l'application avec un état à quatre temps ; il le mérite,
 * parce qu'insérer trois cents lignes sans les avoir regardées est
 * exactement ce qu'on veut rendre impossible.
 */

type Etape = 'depot' | 'association' | 'apercu' | 'resultat'

const ETAPES: readonly { cle: Etape; libelle: string }[] = [
  { cle: 'depot', libelle: 'Dépôt' },
  { cle: 'association', libelle: 'Colonnes' },
  { cle: 'apercu', libelle: 'Aperçu' },
  { cle: 'resultat', libelle: 'Import' },
]

export function AssistantImport() {
  const routeur = useRouter()
  const [enCours, demarrer] = useTransition()

  const [etape, setEtape] = useState<Etape>('depot')
  const [texte, setTexte] = useState('')
  const [source, setSource] = useState<string | null>(null)
  const [separateur, setSeparateur] = useState<Separateur>(',')
  const [avecEntete, setAvecEntete] = useState(true)
  const [format, setFormat] = useState<FormatDate>('JJ/MM/AAAA')
  const [association, setAssociation] = useState<Association | null>(null)
  const [resultat, setResultat] = useState<ResultatImport | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [annule, setAnnule] = useState(false)

  const lignes = useMemo(
    () => (texte.trim() ? analyserCSV(texte, separateur) : []),
    [texte, separateur],
  )

  const entetes = useMemo<string[]>(() => {
    const premiere = lignes[0] ?? []
    if (avecEntete) return [...premiere]
    return premiere.map((_, i) => `Colonne ${i + 1}`)
  }, [lignes, avecEntete])

  const corps = useMemo(
    () => (avecEntete ? lignes.slice(1) : lignes),
    [lignes, avecEntete],
  )

  const preparation = useMemo(() => {
    if (!association) return null
    return preparerLignes(corps, association, format, avecEntete)
  }, [corps, association, format, avecEntete])

  /** Analyse un dépôt : séparateur, en-tête, association et format devinés. */
  const accepter = (contenu: string, nom: string | null) => {
    const sep = detecterSeparateur(contenu)
    const analysees = analyserCSV(contenu, sep)
    const premiere = analysees[0] ?? []
    const entete = ressembleAUnEntete(premiere)
    const assoc = associerEntetes(
      entete ? premiere : premiere.map((_, i) => `Colonne ${i + 1}`),
    )

    const indexEcheance = assoc.echeance
    const colonneDates =
      indexEcheance === null
        ? []
        : (entete ? analysees.slice(1) : analysees).map((l) => l[indexEcheance] ?? '')

    setTexte(contenu)
    setSource(nom)
    setSeparateur(sep)
    setAvecEntete(entete)
    setAssociation(assoc)
    setFormat(detecterFormatDate(colonneDates))
    setErreur(null)
    setEtape('association')
  }

  const lancer = () => {
    if (!association) return
    setErreur(null)
    demarrer(async () => {
      try {
        const retour = await importerTaches({
          texte,
          separateur,
          association,
          format,
          avecEntete,
          source,
        })
        setResultat(retour)
        setEtape('resultat')
      } catch (souci) {
        setErreur(souci instanceof Error ? souci.message : "L'import a échoué.")
      }
    })
  }

  const defaire = () => {
    if (!resultat) return
    demarrer(async () => {
      await annulerImport(resultat.lotId)
      setAnnule(true)
      routeur.refresh()
    })
  }

  return (
    <>
      {/* L'étape franchie garde la couleur d'accent : le chemin déjà parcouru
          reste visible, ce qui rend le « revenir en arrière » évident. */}
      <ol className="flex gap-1 rounded-carte bg-neutre-fond p-1" aria-label="Étapes">
        {ETAPES.map((e, i) => {
          const rang = ETAPES.findIndex((x) => x.cle === etape)
          const atteinte = i <= rang
          const courante = e.cle === etape
          return (
            <li
              key={e.cle}
              aria-current={courante ? 'step' : undefined}
              className={[
                'flex flex-1 items-center justify-center gap-1 rounded-petit py-2 text-11',
                courante
                  ? 'bg-carte font-medium text-texte shadow-carte'
                  : atteinte
                    ? 'text-accent'
                    : 'text-secondaire',
              ].join(' ')}
            >
              <span className="chiffres">{i + 1}</span>
              <span>{e.libelle}</span>
            </li>
          )
        })}
      </ol>

      {erreur ? (
        <p
          role="alert"
          className="carte border-echec bg-echec-fond p-3 text-13 text-echec"
        >
          {erreur}
        </p>
      ) : null}

      {etape === 'depot' ? <EtapeDepot onAccepter={accepter} /> : null}

      {etape === 'association' && association ? (
        <EtapeAssociation
          entetes={entetes}
          association={association}
          setAssociation={setAssociation}
          separateur={separateur}
          setSeparateur={setSeparateur}
          avecEntete={avecEntete}
          setAvecEntete={setAvecEntete}
          format={format}
          setFormat={setFormat}
          nbLignes={corps.length}
          onSuite={() => setEtape('apercu')}
          onRetour={() => setEtape('depot')}
        />
      ) : null}

      {etape === 'apercu' && preparation ? (
        <EtapeApercu
          preparation={preparation}
          enCours={enCours}
          onLancer={lancer}
          onRetour={() => setEtape('association')}
        />
      ) : null}

      {etape === 'resultat' && resultat ? (
        <EtapeResultat
          resultat={resultat}
          annule={annule}
          enCours={enCours}
          onDefaire={defaire}
        />
      ) : null}
    </>
  )
}

// — 1. Dépôt ——————————————————————————————————————————————————————

function EtapeDepot({
  onAccepter,
}: {
  onAccepter: (contenu: string, nom: string | null) => void
}) {
  const [colle, setColle] = useState('')

  return (
    <Widget libelle="Déposer un fichier">
      <p className="text-13 text-secondaire">
        Un export CSV de Todoist, Trello, Asana, Notion ou d&apos;un tableur. Le
        séparateur et le format de date sont devinés, et restent modifiables à
        l&apos;étape suivante.
      </p>

      <label className="mt-4 block">
        <span className="libelle block">Fichier</span>
        <input
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/plain"
          onChange={async (evenement) => {
            const fichier = evenement.target.files?.[0]
            if (!fichier) return
            onAccepter(await fichier.text(), fichier.name)
          }}
          className="w-full py-3 text-13 file:mr-3 file:border file:border-trait file:bg-transparent file:px-3 file:py-2 file:text-13 file:text-texte"
        />
      </label>

      <div className="mt-4">
        <Champ libelle="Ou coller le contenu">
          <Zone
            rows={6}
            value={colle}
            onChange={(e) => setColle(e.target.value)}
            placeholder={'titre;échéance;priorité\nAppeler le comptable;03/04/2026;1'}
          />
        </Champ>
        <div className="mt-3">
          <BoutonPrincipal
            type="button"
            disabled={colle.trim().length === 0}
            onClick={() => onAccepter(colle, null)}
          >
            Analyser
          </BoutonPrincipal>
        </div>
      </div>
    </Widget>
  )
}

// — 2. Association ————————————————————————————————————————————————

function EtapeAssociation({
  entetes,
  association,
  setAssociation,
  separateur,
  setSeparateur,
  avecEntete,
  setAvecEntete,
  format,
  setFormat,
  nbLignes,
  onSuite,
  onRetour,
}: {
  entetes: readonly string[]
  association: Association
  setAssociation: (a: Association) => void
  separateur: Separateur
  setSeparateur: (s: Separateur) => void
  avecEntete: boolean
  setAvecEntete: (v: boolean) => void
  format: FormatDate
  setFormat: (f: FormatDate) => void
  nbLignes: number
  onSuite: () => void
  onRetour: () => void
}) {
  const titreAssocie = association.titre !== null

  return (
    <>
      <Widget
        libelle="Lecture du fichier"
        action={
          <span className="chiffres text-13">
            {nbLignes} ligne{nbLignes > 1 ? 's' : ''}
          </span>
        }
      >
        <div className="flex gap-4">
          <div className="flex-1">
            <Champ libelle="Séparateur">
              <Menu
                value={separateur}
                onChange={(e) => setSeparateur(e.target.value as Separateur)}
              >
                {SEPARATEURS.map((s) => (
                  <option key={s.valeur} value={s.valeur}>
                    {s.libelle}
                  </option>
                ))}
              </Menu>
            </Champ>
          </div>
          <div className="flex-1">
            {/* Le format de date par défaut est belge : confondre le 3 avril
                et le 4 mars sur deux cents lignes est irrattrapable. */}
            <Champ libelle="Format des dates">
              <Menu value={format} onChange={(e) => setFormat(e.target.value as FormatDate)}>
                {FORMATS_DATE.map((f) => (
                  <option key={f.valeur} value={f.valeur}>
                    {f.libelle}
                  </option>
                ))}
              </Menu>
            </Champ>
          </div>
        </div>

        <label className="cible flex items-center gap-3 border-t border-trait">
          <input
            type="checkbox"
            checked={avecEntete}
            onChange={(e) => setAvecEntete(e.target.checked)}
            className="size-5 accent-current"
          />
          <span className="text-13">La première ligne contient les en-têtes</span>
        </label>
      </Widget>

      <Widget libelle="Associer les colonnes">
        {CHAMPS_IMPORT.map((champ) => (
          <Champ
            key={champ.cle}
            libelle={champ.obligatoire ? `${champ.libelle} — obligatoire` : champ.libelle}
          >
            <Menu
              value={association[champ.cle] === null ? '' : String(association[champ.cle])}
              onChange={(e) =>
                setAssociation({
                  ...association,
                  [champ.cle as ChampImport]:
                    e.target.value === '' ? null : Number(e.target.value),
                })
              }
            >
              <option value="">Ignorer</option>
              {entetes.map((entete, i) => (
                <option key={`${entete}-${i}`} value={i}>
                  {entete || `Colonne ${i + 1}`}
                </option>
              ))}
            </Menu>
          </Champ>
        ))}

        <div className="mt-6 flex items-center gap-4">
          <BoutonPrincipal type="button" disabled={!titreAssocie} onClick={onSuite}>
            Voir l&apos;aperçu
          </BoutonPrincipal>
        </div>
        {!titreAssocie ? (
          <p className="mt-2 text-11 text-secondaire">
            Le titre est la seule colonne indispensable.
          </p>
        ) : null}
        <button type="button" onClick={onRetour} className="cible mt-2 text-13 underline">
          Changer de fichier
        </button>
      </Widget>
    </>
  )
}

// — 3. Aperçu —————————————————————————————————————————————————————

function EtapeApercu({
  preparation,
  enCours,
  onLancer,
  onRetour,
}: {
  preparation: ReturnType<typeof preparerLignes>
  enCours: boolean
  onLancer: () => void
  onRetour: () => void
}) {
  const { retenues, rejetees } = preparation

  return (
    <>
      <Widget
        libelle="Dix premières lignes"
        action={<span className="chiffres text-13">{retenues.length} à créer</span>}
      >
        <p className="mb-3 text-13 text-secondaire">
          Rien n&apos;est encore écrit. C&apos;est exactement ce qui sera créé.
        </p>

        <ul>
          {retenues.slice(0, 10).map((ligne, i) => (
            <li key={i} className="border-b border-trait py-2 last:border-b-0">
              <p className="truncate text-15">{ligne.titre}</p>
              <p className="mt-0.5 flex flex-wrap gap-x-3 text-11 text-secondaire">
                {ligne.echeance ? (
                  <span className="chiffres">
                    {ligne.echeance} · {jourRelatif(ligne.echeance)}
                  </span>
                ) : (
                  <span>sans échéance</span>
                )}
                {ligne.projet ? <span>{ligne.projet}</span> : null}
                {ligne.priorite ? (
                  <span>{LIBELLE_PRIORITE[ligne.priorite as Priorite]}</span>
                ) : null}
                {ligne.statut !== 'a_faire' ? (
                  <span>{LIBELLE_STATUT_TACHE[ligne.statut]}</span>
                ) : null}
                {ligne.contexte ? <span>{ligne.contexte}</span> : null}
              </p>
            </li>
          ))}
        </ul>
      </Widget>

      {rejetees.length > 0 ? (
        <Widget
          libelle="Lignes en erreur"
          action={<span className="chiffres text-13">{rejetees.length}</span>}
        >
          {/* Une date illisible est un rejet, pas une échéance vide : importer
              silencieusement des tâches sans date serait pire que le dire. */}
          <ul className="text-13">
            {rejetees.slice(0, 20).map((r) => (
              <li key={r.numero} className="border-b border-trait py-1 last:border-b-0">
                <span className="chiffres text-secondaire">ligne {r.numero}</span> —{' '}
                {r.motif}
              </li>
            ))}
          </ul>
          {rejetees.length > 20 ? (
            <p className="mt-2 text-11 text-secondaire">
              et {rejetees.length - 20} autres.
            </p>
          ) : null}
        </Widget>
      ) : null}

      <Carte>
        <BoutonPrincipal
          type="button"
          disabled={enCours || retenues.length === 0}
          onClick={onLancer}
        >
          {enCours ? 'Import en cours…' : `Importer ${retenues.length} tâches`}
        </BoutonPrincipal>
        <button type="button" onClick={onRetour} className="cible mt-2 text-13 underline">
          Revenir aux colonnes
        </button>
      </Carte>
    </>
  )
}

// — 4. Résultat ———————————————————————————————————————————————————

function EtapeResultat({
  resultat,
  annule,
  enCours,
  onDefaire,
}: {
  resultat: ResultatImport
  annule: boolean
  enCours: boolean
  onDefaire: () => void
}) {
  if (annule) {
    return (
      <Widget libelle="Import annulé">
        <p className="text-13">
          Les {resultat.nbTaches} tâches du lot ont été supprimées. Les projets créés
          au passage ont été conservés — ils peuvent déjà porter d&apos;autres tâches.
        </p>
      </Widget>
    )
  }

  return (
    <Widget libelle="Import terminé">
      <p className="chiffres text-40">{resultat.nbTaches}</p>
      <p className="text-13 text-secondaire">
        tâches créées
        {resultat.nbProjets > 0
          ? `, ${resultat.nbProjets} projet${resultat.nbProjets > 1 ? 's' : ''} créé${resultat.nbProjets > 1 ? 's' : ''}`
          : ''}
        {resultat.nbRejetees > 0 ? `, ${resultat.nbRejetees} ligne(s) ignorée(s)` : ''}
        .
      </p>

      {/* Le filet de sécurité de tout l'écran : trois cents lignes de travers
          se rattrapent en une tape, pas en une heure de ménage. */}
      <div className="mt-6">
        <button
          type="button"
          onClick={onDefaire}
          disabled={enCours}
          className="cible text-13 underline disabled:opacity-40"
        >
          {enCours ? 'Annulation…' : 'Annuler cet import'}
        </button>
      </div>
    </Widget>
  )
}
