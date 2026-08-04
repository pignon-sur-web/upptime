# Origine

Cette skill n'est pas de nous. Elle est copiée telle quelle depuis un dépôt
tiers, et versionnée ici pour une raison précise : les sessions de travail
tournent dans des conteneurs éphémères, où tout ce qui vit hors du dépôt
disparaît à la fermeture. Une skill installée « à côté » serait à réinstaller
chaque fois.

| | |
|---|---|
| **Dépôt** | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill |
| **Version** | 2.11.0 |
| **Commit** | `4d140cf8ff6842de13213c7214eff3810371beb2` |
| **Copié le** | 4 août 2026 |
| **Licence** | MIT — texte intégral dans `LICENSE`, à conserver |

## Ce qui a été copié, et ce qui ne l'a pas été

Seul le sous-arbre `.claude/skills/ui-ux-pro-max/` du dépôt d'origine :
`SKILL.md`, `data/`, `references/`, `scripts/`.

Écartés délibérément : `gallery/`, `screenshots/`, `preview/`, `projects/`,
`cli/`, `docs/`, `stack/`, `src/`. Ce sont la vitrine et l'outillage de
publication du dépôt amont, pas la skill. Les tests Python (`scripts/tests/`)
sont écartés aussi : ils testent le code amont, pas cette application, et ils
tomberaient dans le champ de nos propres bancs d'essai.

## Ce qu'elle fait, et ce qu'elle ne fait pas

Une base de connaissances interrogeable hors ligne — 84 styles, 192 palettes,
74 appariements de polices, 98 règles UX, 22 stacks. Les scripts sont du Python
sans dépendance : ils lisent les JSON de `data/` et n'ouvrent aucune connexion
réseau, ne lancent aucun sous-processus, n'évaluent aucun code. Vérifié à la
copie.

Elle **conseille**, elle ne décide pas. Les jetons de `src/app/globals.css`
restent la référence de l'application : ce qu'on retient de la skill se traduit
dans ces jetons-là.

## Mise à jour

Recloner le dépôt amont et recopier le même sous-arbre. Penser à mettre à jour
la version, le commit et la date de ce fichier — sans quoi personne ne saura
plus de quand date la copie.
