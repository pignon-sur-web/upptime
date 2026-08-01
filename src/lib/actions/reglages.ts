'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase/client'
import { exigerSession } from '@/lib/session'
import { WIDGETS, widgetsAffiches, type CleWidget } from '@/components/widgets/registre'
import { reglagesWidgets } from '@/lib/donnees/widgets'

/**
 * Réglages du tableau de bord.
 *
 * Le registre applicatif reste la seule liste de widgets qui existe ; la table
 * `widget_settings` ne porte que l'activation et l'ordre. Une clé présente en
 * base mais absente du registre est ignorée, et une clé du registre absente de
 * la base est considérée active — ce qui permet d'ajouter ou de retirer un
 * widget dans le code sans migration.
 *
 * L'écriture est un upsert sur `widget_key`, qui est unique : le premier
 * réglage d'un widget jamais touché crée sa ligne, les suivants la modifient.
 */

function connue(cle: string): cle is CleWidget {
  return WIDGETS.some((w) => w.cle === cle)
}

export async function basculerWidget(cle: string, actif: boolean): Promise<void> {
  await exigerSession()
  if (!connue(cle)) throw new Error(`Widget inconnu : ${cle}`)

  const position = await positionActuelle(cle)

  const { error } = await supabase()
    .from('widget_settings')
    .upsert({ widget_key: cle, enabled: actif, position }, { onConflict: 'widget_key' })

  if (error) throw error

  revalidatePath('/')
  revalidatePath('/reglages')
}

/** La position telle que l'affichage la voit aujourd'hui, défauts compris. */
async function positionActuelle(cle: string): Promise<number> {
  const reglages = await reglagesWidgets()
  const enregistree = reglages.find((r) => r.cle === cle)
  if (enregistree) return enregistree.position

  // Jamais réglé : on reprend le rang que le registre lui donne déjà, pour que
  // le premier basculement ne déplace pas le widget au passage.
  const ordre = widgetsAffiches(reglages)
  const index = ordre.findIndex((w) => w.cle === cle)
  return (index === -1 ? WIDGETS.length : index) * 10 + 10
}

/**
 * Déplacer un widget d'un rang.
 *
 * Les deux voisins voient leurs positions réécrites depuis l'ordre affiché, et
 * non échangées : les positions par défaut ne sont pas toutes en base, donc un
 * simple échange ne ferait rien la première fois. Réécrire depuis l'ordre
 * observé est vrai dans tous les cas.
 */
export async function deplacerWidget(
  cle: string,
  direction: 'haut' | 'bas',
): Promise<void> {
  await exigerSession()
  if (!connue(cle)) throw new Error(`Widget inconnu : ${cle}`)

  const reglages = await reglagesWidgets()
  const parCle = new Map(reglages.map((r) => [r.cle, r]))

  // L'ordre complet, désactivés compris : réordonner un widget masqué doit
  // rester possible, sinon le réactiver le ferait réapparaître n'importe où.
  const ordre = widgetsAffiches(reglages.map((r) => ({ ...r, actif: true })))

  const index = ordre.findIndex((w) => w.cle === cle)
  if (index === -1) return

  const cible = direction === 'haut' ? index - 1 : index + 1
  if (cible < 0 || cible >= ordre.length) return

  const permute = [...ordre]
  const [deplace] = permute.splice(index, 1)
  if (!deplace) return
  permute.splice(cible, 0, deplace)

  // Positions de dix en dix : réordonner n'oblige jamais à renuméroter la
  // suite, et il reste de la place pour insérer entre deux.
  const lignes = permute.map((widget, rang) => ({
    widget_key: widget.cle,
    enabled: parCle.get(widget.cle)?.actif ?? true,
    position: (rang + 1) * 10,
  }))

  const { error } = await supabase()
    .from('widget_settings')
    .upsert(lignes, { onConflict: 'widget_key' })

  if (error) throw error

  revalidatePath('/')
  revalidatePath('/reglages')
}
