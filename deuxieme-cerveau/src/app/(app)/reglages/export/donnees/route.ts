import { NextResponse } from 'next/server'
import { exporterTout } from '@/lib/donnees/export'
import { exigerSession } from '@/lib/session'
import { aujourdhui } from '@/lib/date'

export const dynamic = 'force-dynamic'

/**
 * Le téléchargement de l'export.
 *
 * Un gestionnaire de route et non une Server Action : une action ne peut pas
 * renvoyer un fichier à télécharger, elle renvoie des données à React. Ici on
 * veut un `Content-Disposition` et un nom de fichier daté.
 *
 * Le middleware protège déjà ce chemin, mais `exigerSession()` reste là :
 * c'est un point d'entrée HTTP public, et il ne doit pas dépendre d'une seule
 * ligne de configuration de matcher pour ne pas livrer toute la base.
 */
export async function GET() {
  await exigerSession()

  const contenu = await exporterTout()

  return new NextResponse(JSON.stringify(contenu, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="deuxieme-cerveau-${aujourdhui()}.json"`,
      'cache-control': 'no-store',
    },
  })
}
