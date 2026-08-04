import Link from 'next/link'
import { EnTeteSection } from '@/components/nav/EnTete'
import { Widget, Invitation } from '@/components/ui/Widget'
import { Barres } from '@/components/graphiques/Barres'
import { SaisieRapide } from '@/components/finances/SaisieRapide'
import {
  ajustementsDeLAnnee,
  comptesActifs,
  depensesParCategorie,
  moisEnArgent,
  totalNet,
} from '@/lib/donnees/finances'
import { formater, formaterCompact, formaterSigne } from '@/lib/argent'

export const metadata = { title: 'Argent' }

export default async function PageArgent() {
  const [comptes, total, mois, categories, ecarts] = await Promise.all([
    comptesActifs(),
    totalNet(),
    moisEnArgent(),
    depensesParCategorie(),
    ajustementsDeLAnnee(),
  ])

  return (
    <>
      <EnTeteSection
        titre="Argent"
        action={
          <Link href="/argent/echeances" className="libelle">
            Échéances
          </Link>
        }
      />

      <Widget libelle="Total net">
        <p className="chiffres text-40 leading-none">{formaterCompact(total)}</p>
      </Widget>

      {comptes.length === 0 ? (
        <Widget libelle="Comptes">
          <Invitation>
            Créez un premier compte pour commencer à saisir.
          </Invitation>
        </Widget>
      ) : (
        <Widget
          libelle="Comptes"
          action={
            <Link href="/argent/virement" className="libelle">
              Virement
            </Link>
          }
        >
          <ul>
            {comptes.map((compte) => (
              <li key={compte.id} className="border-b border-trait last:border-b-0">
                <Link
                  href={`/argent/comptes/${compte.id}`}
                  className="cible flex items-baseline justify-between gap-4 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-15">{compte.nom}</span>
                    {/* Un écart entre solde total et solde pointé signale une
                        écriture post-datée : la banque ne dira pas la même
                        chose, et il vaut mieux le voir que le chercher. */}
                    {compte.soldePointeCents !== compte.soldeCents ? (
                      <span className="chiffres block text-11 text-secondaire">
                        pointé {formater(compte.soldePointeCents)}
                      </span>
                    ) : null}
                  </span>
                  <span className="chiffres shrink-0 text-15">
                    {formater(compte.soldeCents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Widget>
      )}

      {comptes.length > 0 ? (
        <Widget libelle="Saisir">
          <SaisieRapide comptes={comptes.map((c) => ({ id: c.id, nom: c.nom }))} />
        </Widget>
      ) : null}

      {mois.courant.entreesCents > 0 || mois.courant.sortiesCents > 0 ? (
        <Widget libelle="Le mois en argent">
          <div className="flex justify-between gap-4">
            <span>
              <span className="libelle block">Entrées</span>
              <span className="chiffres text-18">{formater(mois.courant.entreesCents)}</span>
            </span>
            <span className="text-right">
              <span className="libelle block">Sorties</span>
              <span className="chiffres text-18">{formater(mois.courant.sortiesCents)}</span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-trait pt-3">
            <span className="libelle">Solde du mois</span>
            <span className="chiffres text-24">{formaterSigne(mois.courant.netCents)}</span>
          </div>
          {mois.precedent.netCents !== 0 ? (
            <p className="chiffres mt-1 text-right text-11 text-secondaire">
              {formaterSigne(mois.courant.netCents - mois.precedent.netCents)} vs mois dernier
            </p>
          ) : null}
        </Widget>
      ) : null}

      {categories.length > 0 ? (
        <Widget libelle="Dépenses par catégorie">
          <Barres
            lignes={categories.map((c) => ({
              libelle: c.categorie,
              valeurCents: c.depenseCents,
              variationCents: c.variationCents,
            }))}
          />
        </Widget>
      ) : null}

      {ecarts.nombre > 0 ? (
        <Widget libelle="Écarts de rapprochement">
          {/* Ce chiffre est là pour être regardé : s'il grossit, ce n'est pas
              l'application qui dérive, ce sont des saisies qui manquent. */}
          <p className="text-13">
            <span className="chiffres">{ecarts.nombre}</span> ajustements sur douze
            mois, total <span className="chiffres">{formaterSigne(ecarts.totalCents)}</span>.
          </p>
        </Widget>
      ) : null}
    </>
  )
}
