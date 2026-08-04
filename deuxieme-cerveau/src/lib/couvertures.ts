import { urlSupabase } from '@/lib/env'

/**
 * URL publique d'une couverture de livre.
 *
 * Le bucket est public et les objets portent un nom aléatoire, plutôt que
 * privé avec des URL signées : sans rôle `authenticated`, une URL signée
 * expire et casse le cache des images à chaque rendu. Une couverture de livre
 * n'est pas un secret, et un nom UUID est indevinable.
 */
export function urlCouverture(chemin: string): string {
  return `${urlSupabase()}/storage/v1/object/public/couvertures/${chemin}`
}
