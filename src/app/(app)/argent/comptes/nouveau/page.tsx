import { EnTeteSection } from '@/components/nav/EnTete'
import { BoutonPrincipal, Champ, Menu, Saisie } from '@/components/ui/Champ'
import { creerCompteEtRevenir } from '@/lib/actions/finances'

export const metadata = { title: 'Nouveau compte' }

const TYPES = [
  { valeur: 'courant', libelle: 'Compte courant' },
  { valeur: 'epargne', libelle: 'Épargne' },
  { valeur: 'especes', libelle: 'Espèces' },
  { valeur: 'carte', libelle: 'Carte' },
  { valeur: 'investissement', libelle: 'Investissement' },
]

export default function PageNouveauCompte() {
  return (
    <>
      <EnTeteSection titre="Nouveau compte" retour="/argent" />
      <form action={creerCompteEtRevenir} className="px-5 py-4">
        <Champ libelle="Nom">
          <Saisie name="nom" required autoComplete="off" placeholder="Compte courant" />
        </Champ>

        <Champ libelle="Type">
          <Menu name="type" defaultValue="courant">
            {TYPES.map((t) => (
              <option key={t.valeur} value={t.valeur}>
                {t.libelle}
              </option>
            ))}
          </Menu>
        </Champ>

        {/* Le solde d'ouverture est le point de départ du grand livre : tout
            le reste est une somme d'écritures posée dessus. Le renseigner
            maintenant évite un premier rapprochement pour rien. */}
        <Champ
          libelle="Solde d'ouverture"
          aide="Le solde actuel du compte. Les écritures s'ajouteront à partir de là."
        >
          <Saisie
            name="ouverture"
            inputMode="decimal"
            defaultValue="0,00"
            autoComplete="off"
          />
        </Champ>

        <div className="mt-6">
          <BoutonPrincipal type="submit">Créer le compte</BoutonPrincipal>
        </div>
      </form>
    </>
  )
}
