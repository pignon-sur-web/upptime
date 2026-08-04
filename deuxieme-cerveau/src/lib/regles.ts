/**
 * Constantes de domaine partagées entre le serveur et le client.
 *
 * Elles ne peuvent pas vivre dans un fichier `'use server'` : un tel module
 * n'a le droit d'exporter que des fonctions asynchrones, tout le reste
 * devenant une erreur de compilation.
 */

/**
 * Le rattrapage des habitudes ne remonte pas au-delà d'une semaine.
 *
 * On oublie parfois de cocher le soir même, ce qui justifie le rattrapage ;
 * mais pouvoir réécrire un mois d'historique ferait perdre au score toute
 * valeur de constat.
 */
export const JOURS_RATTRAPAGE = 7
