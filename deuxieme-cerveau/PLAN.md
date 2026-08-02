# Mon 2ᵉ Cerveau — plan d'implémentation

## Contexte

**Mon 2ᵉ Cerveau** est une application web personnelle mono-utilisateur,
installable en PWA sur iPhone, destinée à remplacer Notion. Le critère de
réussite n'est pas la couverture fonctionnelle mais le rituel : ouvrir l'app
chaque soir, cocher ses habitudes, saisir ses dépenses, sans y penser.

Le seul dépôt de la session, `pignon-sur-web/upptime`, est une instance
**Upptime** — configuration et données de monitoring, zéro code applicatif.
L'application n'y a pas sa place : on crée un dépôt propre et **upptime n'est
pas touché du tout**, pas un commit, pas un fichier. Son monitoring continue.

### Décisions prises avec vous

| Sujet | Décision |
|---|---|
| Dépôt | **Nouveau dépôt privé `pignon-sur-web/deuxieme-cerveau`**, l'app à la racine. |
| Données | Supabase Postgres + Storage, projet créé maintenant. |
| Authentification | **Pas de magic link.** Mot de passe unique + cookie signé 1 an. |
| Import | Écran d'import **CSV générique** avec association de colonnes. |
| Emoji des habitudes | **Conservés en couleur**, et devenus la règle : chaque carte porte le sien, c'est le repère qu'on attrape au balayage avant d'avoir lu le titre. |
| Portée | **Les 5 phases**, en une session, un commit par phase. |

### Mise en place du dépôt

1. `create_repository` → `pignon-sur-web/deuxieme-cerveau`, privé, sans
   initialisation. Si l'organisation refuse la création, bascule automatique sur
   `sachaverminck1-gif/deuxieme-cerveau` et je vous le signale.
2. Rattachement à la session en écriture, clone dans `/home/user/deuxieme-cerveau`.
3. Le travail est poussé sur **`main`**, branche par défaut du nouveau dépôt —
   il est créé vide pour ça, il n'y a rien à protéger. Aucune *pull request*
   n'est ouverte sans que vous le demandiez.

### Écarts assumés par rapport au brief

**1. L'authentification.** Le brief impose Supabase Auth par magic link. Sur iOS,
un magic link ouvre Safari et éjecte l'utilisateur de la PWA à chaque
reconnexion — précisément la friction qui ferait échouer le critère §8. On garde
Supabase pour ce qui a de la valeur — Postgres durable, multi-appareils, Storage —
et on remplace l'auth par une porte à mot de passe.

Conséquence, plus simple que la RLS par utilisateur : **tout accès base se fait
côté serveur** avec la clé `service_role` (jamais dans le navigateur), et la base
est murée en trois couches (voir « Sécurité »).

**2. `habits.active` remplacé par `started_on` / `archived_on`.** Un booléen
`active` réécrit l'historique : archiver une habitude en mars ferait passer
rétroactivement toutes vos journées à 100 % à 66 %. Avec des dates de fenêtre,
**rien de ce que vous faites aujourd'hui ne change le score d'hier.** S'y ajoute
`days_of_week`, sans quoi une habitude en semaine casse votre série chaque samedi
ou fausse le dénominateur du week-end.

**3. `is_adjustment` fusionné dans `kind`.** Deux colonnes pour une seule
information. `kind in ('income','expense','transfer','adjustment')`.

> Version : le brief impose Next.js 15 → **15.5.22** (dernier patch de la
> branche). React 19.2, TypeScript 5.9, Tailwind 4.3.

---

## Arborescence

Dépôt `pignon-sur-web/deuxieme-cerveau`, cloné dans `/home/user/deuxieme-cerveau`.
L'application est à la racine : racine du projet Vercel = racine du dépôt.

```
deuxieme-cerveau/
├── package.json  next.config.ts  tsconfig.json  postcss.config.mjs
├── .env.example  .gitignore  eslint.config.mjs  README.md
├── supabase/migrations/0001…0009.sql   +  seed.sql (facultatif)
├── scripts/generer-icones.mjs
├── public/  (icônes PNG, sw.js)
└── src/
    ├── middleware.ts
    ├── app/
    │   ├── layout.tsx  globals.css  manifest.ts  connexion/  hors-ligne/
    │   └── (app)/  page.tsx (tableau de bord)
    │        habitudes/ taches/ taches/importer/ projets/ argent/ agenda/
    │        objectifs/ journal/ sport/ lectures/ notes/ inbox/ cours/
    │        clients/ tout/ reglages/ reglages/export/
    ├── components/  ui/  graphiques/  nav/  widgets/
    └── lib/  auth.ts session.ts date.ts argent.ts enums.ts csv.ts
              supabase/  donnees/  actions/
```

Le `README.md` documente la mise en route (variables d'environnement, migrations,
bucket Storage, déploiement Vercel) — c'est un dépôt qui doit pouvoir se
reconstruire sans moi.

`lib/donnees/` = lectures (une fonction par besoin, toutes enveloppées dans
`cache()`), `lib/actions/` = écritures (`'use server'`). C'est la seule ligne
architecturale, et elle épouse exactement le modèle React : les lectures ont lieu
au rendu, les écritures en POST. Pas de `services/`, pas de `repositories/`.

---

## Direction artistique — appliquée par l'outillage

> **Révision d'août 2026.** La première version était monochrome : aucun rayon,
> aucune ombre, aucune teinte, l'information portée par le seul remplissage en
> Encre. Elle était cohérente et elle était illisible à l'usage — un tableau de
> bord entièrement gris ne dit pas où regarder. Le système ci-dessous la
> remplace. La méthode, elle, n'a pas changé : ce que la DA n'autorise pas
> n'existe pas dans Tailwind.

`src/app/globals.css` vide les espaces de noms puis redéclare les seules
valeurs du système. Après ça, `text-red-500`, `rounded-xl` et `shadow-2xl` ne
compilent pas.

```css
@theme {
  --color-*: initial;  --radius-*: initial;  --shadow-*: initial;
  --text-*: initial;   --font-*: initial;    --blur-*: initial;

  --radius-petit: 6px;   /* cases, pastilles, champs */
  --radius-carte: 10px;  /* tout ce qui est un bloc */
  --radius-plein: 999px; /* pilules et jauges */
}

@theme inline {
  --color-carte: var(--carte);          /* le blanc qui se détache du fond */
  --color-accent: var(--accent);        /* le bleu des gestes */
  --color-urgent: var(--urgent);        /* … et son fond pâle -urgent-fond */
  --shadow-carte: var(--ombre);         /* une ombre, et une seule */
}
```

`@theme inline` fait pointer les utilitaires sur la variable et non sur sa
valeur : la bascule clair/sombre tient dans la seule media query, sans classe
`dark:`.

### Les couleurs disent trois choses

| Famille | Ce qu'elle signifie | Où |
|---|---|---|
| **Bleu** (`accent`) | *une action que j'ai faite, l'endroit où je suis* | case cochée, onglet actif, bouton principal, anneau en cours, champ au focus |
| **Vert / rouge** (`reussite`, `echec`) | *un verdict sur une période close* | jour plein, série tenue, mur du mois, échéance dépassée, solde négatif |
| **Étiquettes** (`urgent`, `important`, `neutre`) | *une priorité Eisenhower* | badges en fond pâle avec pastille, jamais en aplat |

La distinction bleu/vert n'est pas décorative. Avant, la case cochée était
verte : elle disait « bravo » à chaque clic, et il ne restait plus rien pour
dire « la journée est bonne ». Une couleur qui ne rentre dans aucune de ces
trois cases n'a pas lieu d'être.

### La carte

Toute l'interface est une pile de cartes blanches sur un fond sourd
(`#f7f7f5`), séparées par un `gap-3` porté par le layout et non par les
cartes. Géométrie définie **une seule fois**, dans la classe `.carte` :
bordure `--trait`, rayon `--rayon`, ombre `--ombre`. Deux cartes légèrement
différentes sur le même écran se voient et se lisent comme un bug d'affichage.

Les primitives qui en découlent : `Carte` / `EnTeteCarte` (emoji + titre +
action), `Widget` (leur assemblage, appelé par les vingt et quelques widgets),
`Badge` / `BadgePriorite`, `Jauge` et `Barre` (le pourcentage à gauche, en
chiffres tabulaires de largeur fixe, pour que la colonne reste comparable),
`Onglets` (vues exclusives, segment actif en carte blanche dans une rainure),
`Pilule` / `BarreFiltres` (filtres cumulables).

**Piège Tailwind v4 traité en phase 1 :** la couleur de bordure par défaut est
passée de `gray-200` à `currentColor`. Règle : toujours `border-trait`, jamais
`border` seul. Une règle ESLint le vérifie.

Reste : polices `next/font/google` auto-hébergées ; grille 8px ; transition
unique `120ms ease-out` neutralisée sous `prefers-reduced-motion` ; case cochée
en `scale(0)→scale(1)` avec `transform-origin: center`, donc remplie du centre
vers les bords ; tous les nombres en `font-mono`.

Discipline iOS obligatoire, `input, select, textarea { font-size: 16px }` — en
dessous, Safari zoome le viewport à la mise au point et n'en revient jamais.

### Le mur du mois

SVG à la main, une case par jour **du mois réel** (28 à 31), sur **7 colonnes
alignées sur les jours de la semaine** plutôt qu'un bloc de 30 : à encombrement
égal, l'alignement hebdomadaire fait ressortir le motif des week-ends.

Case = rainure grise pleine aux coins arrondis ; le score est un `<rect>`
**monté depuis le bas**, hauteur `palier/5` avec `palier = ceil(score × 5)`.
Pas d'opacité, pas de gradient : un remplissage littéral. Vert quand la journée
est pleine, rouge quand elle est restée vide alors que quelque chose était
demandé, bleu entre les deux. Une rainure pleine plutôt qu'un contour vide :
à cette taille, un carré vidé par un filet se lit comme une absence de donnée,
pas comme un jour à zéro.

Un jour sans aucune habitude programmée rend `score = null` → tiret, pas zéro.
« Rien ne vous était demandé » n'est pas « vous avez échoué ».

---

## Navigation

Barre basse **texte seul, sans icône** — un glyphe de 1px à 24px est
ambigu, un mot ne l'est pas, et c'est plus proche de l'esprit du brief.
Quatre créneaux de ~97 × 52px (+ `env(safe-area-inset-bottom)`), donc bien
au-delà des 44px :

`Accueil · Tâches · Argent · Tout`

Les habitudes ne prennent pas de créneau : elles se cochent depuis le tableau de
bord, qui est déjà l'écran d'accueil. **Tout** ouvre un panneau plein écran
listant les 13 sections en lignes de 56px, **les plus utilisées en bas** — c'est
là que le pouce arrive — et fermé par une ligne « Fermer » en bas, elle aussi
atteignable.

Actif = bleu d'accent + graisse 600, la même couleur que les cases qu'on coche :
dans les deux cas elle dit « c'est là que je suis ». Section courante dans le
panneau = fond bleu pâle.

Un bouton retour 44 × 44 est obligatoire sur les écrans de détail : en mode
standalone il n'y a pas de bouton retour du navigateur et le geste de bord iOS
est peu fiable.

---

## Fuseau horaire — le risque n° 1

Vercel et Supabase tournent en UTC ; vous êtes en **Europe/Brussels**. Entre
minuit et 2h du matin, UTC est encore *hier* : une habitude cochée à 00h30 est
enregistrée le mauvais jour et votre série casse le lendemain matin. C'est le bug
qui tue la promesse de l'app. Trois protections :

- SQL : une fonction `app_today()` = `(now() at time zone 'Europe/Brussels')::date`,
  utilisée partout. **`current_date` est banni.**
- TS : un seul `aujourdhui()` dans `lib/date.ts`, via
  `Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' })` — la locale
  `en-CA` produit directement `YYYY-MM-DD`.
- Les colonnes qui désignent un jour du calendrier sont de type `date`, jamais
  `timestamptz`. Seul l'agenda utilise `timestamptz`.

Une règle ESLint `no-restricted-syntax` interdit
`new Date().toISOString().slice(0,10)`, et un grep sur `current_date` tourne
avant chaque commit. Le changement d'heure est géré gratuitement puisqu'on nomme
la zone au lieu d'un décalage.

---

## Sécurité — trois couches

1. **Porte applicative.** `src/middleware.ts` protège tout sauf `/connexion`,
   `/_next/static`, `/_next/image`, `/icons`, `/manifest.webmanifest`, `/sw.js`.
   Cookie `session` = jeton signé HMAC-SHA256 (Web Crypto, compatible Edge),
   `HttpOnly`, `Secure`, `SameSite=Lax`, 1 an. Comparaison du mot de passe en
   temps constant écrite à la main (l'Edge n'a pas `timingSafeEqual`), délai fixe
   d'environ 400 ms sur chaque tentative. La signature couvre un numéro de
   version : le bumper vous déconnecte partout.
   *Si `/sw.js` reçoit une redirection 307, l'enregistrement du service worker
   échoue et la PWA ne s'installe jamais — d'où le matcher explicite.*
2. **RLS.** `enable row level security` sur chaque table, **aucune policy**.
3. **Révocations — `0009_lockdown.sql`.** C'est la couche que la RLS seule ne
   couvre pas : **une vue Postgres s'exécute par défaut avec les droits de son
   propriétaire**, donc `solde_compte` aurait été lisible par la clé anonyme
   malgré la RLS sur `transactions`. Chaque vue porte donc
   `with (security_invoker = true)`, et la migration révoque explicitement tous
   les droits d'`anon` et `authenticated` sur les tables, vues, fonctions et
   séquences, y compris les privilèges par défaut. `service_role` a `BYPASSRLS`,
   le code serveur n'est pas affecté.

`lib/supabase/client.ts` commence par `import 'server-only'` : toute importation
depuis un composant client devient une **erreur de compilation**, pas une clé
`service_role` livrée au navigateur.

**Test de non-régression, à repasser à chaque phase :** avec la clé *anon*,
`curl "$SUPABASE_URL/rest/v1/solde_compte?select=*" -H "apikey: $ANON"` doit
renvoyer une erreur de permission. Idem sur `transactions` et `notes`.

---

## Schéma — points de conception

Neuf migrations dans `supabase/migrations/`, appliquées **en une fois au
début** (les écrans, eux, se construisent phase par phase — c'est le même
résultat qu'une migration par phase, avec un seul aller-retour dans l'éditeur SQL
Supabase au lieu de cinq).

`0001_socle` (extension `unaccent`, configuration FTS française, `app_today()`,
trigger `updated_at`) · `0002_habitudes` · `0003_travail` (projets, tâches,
objectifs, résultats clés) · `0004_finances` · `0005_vie` (clients, agenda,
journal, sport, lectures, cours, notes, inbox) · `0006_widgets` ·
`0007_vues` · `0008_fonctions` · `0009_lockdown`.

**Argent en centimes entiers.** `amount_cents integer`, pas `numeric` : PostgREST
sérialise `numeric` en *nombre* JSON, donc `19,99` fait un aller-retour par un
flottant JS. Règle : toute colonne suffixée `_cents` est un entier, et rien
d'autre dans l'app n'est de l'argent. Formatage à la sortie via
`Intl.NumberFormat('fr-BE', { style:'currency', currency:'EUR' })`.

**Énumérations en `text` + `CHECK`, pas en type ENUM.** Un ENUM Postgres ne se
renomme ni ne se supprime sans échanger le type entier, et `ALTER TYPE … ADD
VALUE` ne peut pas être utilisé dans la transaction qui s'en sert ensuite. Avec
`text` + `CHECK`, faire évoluer une valeur tient en une ligne réversible.
**Exception : les priorités sont des `smallint`** (0 à 3), pour que
`order by priority` fonctionne — c'est la seule chose qu'on perd avec du texte.

**`notes.tags` et `workouts.muscle_groups` en `text[]`** avec index GIN :
containment `@>`, `unnest()` pour un nuage de tags, et filtre PostgREST
`.contains()` direct. Ni jsonb ni table de liaison.

**Recherche plein texte française.** Une configuration
`fr_unaccent` (copie de `french` + `unaccent`) rend `to_tsvector` immuable et
insensible aux accents, ce qui est la condition pour l'utiliser dans une colonne
générée — la version naïve avec `array_to_string()` ou `unaccent()` seul est
rejetée par Postgres. Requêtes en `websearch_to_tsquery` (tolère les guillemets
et les `-exclusions` tapés au pouce). Chercher `resume` trouvera « résumé ».

**Index.** Seuls ~10 index méritent d'exister ; sur des tables de moins de mille
lignes, Postgres fait un balayage en moins d'une milliseconde et un index est du
folklore. Ceux qui travaillent : `habit_logs(habit_id,date)` unique,
`habit_logs(date)`, `tasks(due_date) where status in ('todo','doing')`,
`transactions(account_id, date desc)`, `transactions(date desc)`,
`upcoming_payments(due_date) where paid_at is null`, `notes gin(search_vector)`,
`notes gin(tags)`, `events(starts_at)`, `clients(next_followup)`.

### Vues et fonctions calculées (`0007`, `0008`)

Toutes en `security_invoker = true`, toutes calculées à la requête — **rien de
matérialisé** : une vue matérialisée demande un rafraîchissement et un solde
périmé est un pire bug qu'une requête de 3 ms.

- `solde_compte` — `opening_balance_cents + SUM(amount_cents)`, plus un
  `solde_pointe` limité à `date <= app_today()` : le jour où vous post-datez un
  loyer, « pourquoi mon app ne dit pas la même chose que ma banque » a une
  réponse évidente au lieu d'une enquête.
- `score_habitude_jour` — une habitude compte le jour D si
  `started_on <= D`, `D < archived_on` et que le jour de semaine de D est dans
  `days_of_week`. Série de dates générée par `generate_series`, jointure
  **externe** sur `habits` pour qu'un jour sans habitude programmée existe quand
  même avec `score = null`.
- `habit_streak(habit_id)` et `global_habit_streak()` — la série ne compte que
  les jours **programmés**, et **aujourd'hui n'est pas une preuve d'échec tant
  que la journée n'est pas finie** : une série qui se remet à zéro à minuit est
  un bug, pas un choix. La rupture est constatée le lendemain.
- `avancement_projet` — tâches faites / tâches non annulées, `null` (pas `0`) si
  le projet n'a aucune tâche : un projet neuf n'est pas à 0 %, il est inconnu.
  L'interface affiche un tiret.
- `progression_objectif` — moyenne de `(actuel − départ)/(cible − départ)`,
  bornée 0..1. Cette forme gère gratuitement les résultats clés **décroissants**
  (perdre 8 kg : départ 86, cible 78, actuel 82 → 0,5). Cas dégénéré
  `cible = départ` résolu en tout-ou-rien plutôt qu'en division par zéro.
- `finances_mensuelles` — entrées, sorties, net, et un `ajustements_cents`
  **à part**. Décision : les virements et les ajustements sont exclus du net. Un
  virement entre vos comptes n'est ni un revenu ni une dépense ; un ajustement
  est une correction de mesure, pas un événement économique. Il compte dans le
  solde (c'est une vraie ligne) mais pas dans « combien j'ai dépensé ». Le total
  des ajustements reste visible : s'il grossit, c'est que vous oubliez de saisir.
- `depenses_par_categorie` — avec **remplissage des mois manquants**. Un `lag()`
  naïf sur une catégorie sans dépense le mois dernier remonte deux mois en
  arrière et affiche une variation absurde.
- `budget_statut` — plafond du mois, sinon plafond par défaut. Dépassement rendu
  par **inversion** de la ligne. Pas de rouge disponible, et l'inversion crie
  plus fort que le rouge de toute façon.

### Trois comportements conçus en détail

**Ajustement de solde** — RPC `record_balance_adjustment(compte, solde_reel,
date)`. En SQL et non dans l'action serveur, pour que le solde calculé et l'écart
inséré viennent du **même instantané** et que l'app ne puisse jamais être en
désaccord avec le grand livre. Le rapprochement se fait à la date de
l'ajustement (`date <= date_ajustement`), sinon un loyer post-daté se retrouve
plié dans l'écart du jour.

Parcours : le solde calculé est réaffiché au-dessus du champ, l'écart s'affiche
en direct pendant la saisie, le serveur recalcule et renvoie l'écart réel.
Écart nul → « Déjà à jour », **aucune ligne créée**. Écart supérieur à 100 € →
seconde confirmation. Les lignes d'ajustement portent un `≠` et un filet gauche
de 2px, ne sont pas modifiables, et les supprimer prévient de l'effet sur le solde.

**Tâches récurrentes** — génération à la complétion, comme prévu, mais le modèle
naïf a trois défauts que deux colonnes corrigent :

| Défaut | Correction |
|---|---|
| Tâche quotidienne oubliée 8 jours → une occurrence en retard régénérée à chaque validation, donc 8 tapes pour rattraper | On avance en boucle jusqu'à dépasser aujourd'hui : un seul saut. |
| Loyer au 31 janvier → `+1 mois` = 28 février, puis 28 mars : le loyer a déménagé | Chaque échéance se calcule depuis `series_origin_date + n × intervalle`, jamais par additions successives. 31 jan + 2 mois = 31 mars, exact. |
| Double tape sur un réseau lent → deux occurrences suivantes | Index unique partiel « une seule occurrence ouverte par série » + `select … for update` + retour immédiat si déjà fait. Structurellement impossible. |

S'y ajoute `recurrence_anchor` : *schedule* (le loyer, la revue hebdo — la date
est fixée de l'extérieur, le retard ne la déplace pas) ou *completion* (arroser
les plantes tous les 3 jours — le compteur repart quand vous le faites
réellement). Ce ne sont pas deux cas limites, ce sont deux récurrences
différentes ; se tromper est visible et agaçant, demander une fois est une tape.

Modèle « gabarit + instances » écarté : il exige un cron (nouvelle
infrastructure, nouveau mode de panne, et un point d'entrée exempté d'auth qui
perce le middleware), il ré-accumule l'arriéré qu'on cherchait à éviter, et il
introduit la notion de « détacher cette instance ». Quatre problèmes achetés
pour un résolu.

**Virements** — RPC `record_transfer`, pas deux insertions dans une action
serveur. Deux insertions peuvent réussir à moitié : l'argent quitte le compte A
et n'apparaît nulle part, le solde est silencieusement faux, et vous le
découvrez trois semaines plus tard sans savoir quelle ligne est orpheline.
C'est exactement la classe de bug que cette app existe pour éviter.
Symétriquement, une ligne portant un `transfer_group_id` n'a **pas** de
suppression individuelle dans le grand livre, seulement « Supprimer le virement »
qui appelle `delete_transfer`.

---

## Import CSV de tâches

Nouvel écran `/taches/importer`, en quatre étapes, conçu pour survivre à
n'importe quel export (Todoist, Trello, Asana, Notion, un tableur maison).

1. **Dépôt** — fichier ou copier-coller. Détection du séparateur `,` `;` ou
   tabulation : les exports Excel français utilisent le point-virgule, et c'est
   la première chose qui casse un import.
2. **Association** — pour chaque champ de l'app (titre*, priorité, échéance,
   contexte, projet, statut, note), un menu des colonnes détectées, **pré-rempli
   par correspondance approximative** sur les en-têtes connus. Le format de date
   est deviné puis modifiable (`JJ/MM/AAAA` par défaut, vous êtes en Belgique —
   confondre le 3 avril et le 4 mars sur 200 lignes est irrattrapable).
3. **Aperçu** — les 10 premières lignes telles qu'elles seront créées, et le
   compte des lignes en erreur avec leur motif. Rien n'est écrit à cette étape.
4. **Import** — une RPC transactionnelle. Les projets absents sont créés par nom.
   Chaque lot porte un `import_batch_id` : **un import raté se défait d'une
   tape**, ce qui compte quand on vient d'insérer 300 lignes de travers.

Analyseur CSV écrit à la main (~60 lignes, RFC 4180 : guillemets, virgules et
retours à la ligne encapsulés), testé sur des cas limites. Pas de dépendance.

## Export JSON

L'offre gratuite Supabase **n'a pas de sauvegarde automatique** — ce serait votre
unique copie d'une année de journal. `/reglages/export` produit un dump JSON
complet de toutes les tables en un clic. Cinq minutes de travail, et c'est la
différence entre un incident et une perte définitive.

---

## Séquence — 6 commits

Le brief demande un arrêt après chaque phase ; vous avez demandé « on fait tout ».
On construit d'une traite, mais **un commit par phase**, relisible et révocable
isolément.

| # | Contenu | Vérification avant commit |
|---|---|---|
| **1** | Phase 1. Échafaudage, tokens CSS, polices, layout + navigation, porte à mot de passe, client Supabase, PWA (manifest, icônes, `sw.js`), primitives `<Widget>` `<Case>` `<Jauge>`. Les 13 routes existent en ébauche. **Les 9 migrations sont appliquées.** | Build et `tsc` propres. `/` déconnecté → `/connexion`. Mauvais mot de passe → pas de cookie. **Test d'altération : modifier un caractère du cookie doit déconnecter** (c'est ce qui prouve que le HMAC est réel). `/sw.js` répond 200, pas 307. Test anon sur la base. `app_today()` renvoie la date belge. Cibles ≥ 44px en 390×844. |
| **2** | Phase 2. Habitudes : écran cochable en un tap, rattrapage 7 jours, réglages. Widgets « Le jour » et « Habitudes du jour ». Mur du mois + courbe 30/90/365 en SVG. | **Cocher à 23h55 heure belge enregistre aujourd'hui, pas demain.** Série correcte sur une habitude en semaine (ne casse pas le samedi). Score `null` sur un jour sans habitude programmée. |
| **3** | Phase 3. Tâches et projets : Aujourd'hui (retards avec filet 2px), 7 prochains jours, Toutes, report en un tap, sous-tâches, récurrences, **import CSV**. Projets avec avancement et jours restants. 4 widgets. | Tâche mensuelle née le 31 → 31 jan / 28 fév / 31 mars, sans dérive. Quotidienne en retard de 8 jours → **une** occurrence, demain. Double tape → une seule. Import d'un CSV à point-virgule + dates `JJ/MM/AAAA`, puis annulation du lot. |
| **4** | Phase 4. Finances : comptes, ajustement de solde, saisie rapide, virements, mois en argent, dépenses par catégorie en barres SVG, paiements à venir, budgets. 3 widgets. | Rapprochement → l'écart vaut exactement la différence et le solde égale le nombre saisi. Second rapprochement à vide → « Déjà à jour », zéro ligne. Virement → deux jambes, somme nulle, net mensuel inchangé ; suppression → les deux partent. Catégorie avec un mois creux → comparaison à `0`, pas à un chiffre d'il y a deux mois. |
| **5** | Phase 5a. Agenda (semaine, mois, tâches datées en lecture seule). Objectifs et résultats clés. Journal prérempli par le score et les tâches faites, bilans hebdo et mensuel. 2 widgets. | Résultat clé décroissant (perdre 8 kg) → progression correcte. Objectif sans résultat clé → tiret, pas 0 %. |
| **6** | Phase 5b. Inbox et conversion, Sport, Lectures + upload de couverture, Notes + recherche, Cours, Clients (alerte > 30 jours). Réglages des widgets. **Export JSON.** | Recherche `resume` trouve « résumé ». Upload d'une couverture → image affichée. Désactiver 5 widgets → 10 rendus, sans décalage. Réordonner → persiste. |

**Données de démonstration :** le brief interdit toute donnée en dur *dans les
composants* — respecté strictement. Un `supabase/seed.sql` facultatif, à exécuter
à la main, permet de regarder l'app remplie. Aucun composant n'en dépend.

### Performance

`export const preferredRegion = 'fra1'` + projet Supabase en `eu-central-1`.
C'est la ligne de configuration la plus rentable du projet : elle fait passer
chaque requête de ~90 ms à ~4 ms et rend la question du nombre de requêtes du
tableau de bord largement théorique. Chaque widget reste un composant serveur
autonome sous son propre `<Suspense>`, ses lectures enveloppées dans `cache()`
(dédoublonnage inter-widgets) et groupées en `Promise.all` à l'intérieur.

---

## Vérification finale

- `npm run build`, `npx tsc --noEmit`, `npm run lint` propres.
- Assertion ciblée sur le CSS généré : `rounded-lg` et `shadow-md` **n'existent
  pas** dans la sortie (c'est ce qui prouve que la neutralisation des espaces de
  noms Tailwind a pris, un build vert ne le dirait pas).
- Parcours réels au navigateur (Chromium préinstallé, Playwright) une fois vos
  clés en place : connexion, cochage d'habitude, ajustement de solde, virement,
  report de tâche, import CSV.
- Captures en clair et en sombre pour contrôler polices, échelle typographique,
  fermeture des espaces de noms et rendu réel de la carte.
- Grep de non-régression : aucun `current_date`, aucun `toISOString().slice`.

## Ce dont j'ai besoin de vous

1. Créez le projet sur supabase.com, **région `eu-central-1` (Frankfurt)** — même
   région que le déploiement Vercel (`fra1`).
2. Project Settings → API : collez-moi `Project URL` et la clé `service_role`.
3. Choisissez le mot de passe de l'application (24 caractères ou plus — c'est un
   secret unique sans limitation de tentatives côté Supabase ; le délai fixe de
   400 ms couvre le reste).

Je m'occupe des migrations, du bucket Storage et du `.env.local` (ignoré par git,
la clé n'ira jamais dans le dépôt).

Rien ne bloque le démarrage : je crée le dépôt et j'attaque la phase 1
immédiatement, les clés ne sont nécessaires qu'à la fin de celle-ci.

### Déploiement Vercel, à la fin

Importer `pignon-sur-web/deuxieme-cerveau`, **Root Directory = racine**, région
`fra1`, et les quatre variables : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`APP_PASSWORD`, `AUTH_SECRET`.

## Points de vigilance suivis

| Risque | Traitement |
|---|---|
| Fuseau — cocher la mauvaise journée | `app_today()` en SQL, `aujourdhui()` en TS, colonnes `date`, règle ESLint, grep avant commit. |
| Service worker servant un tableau de bord périmé | **Network-only sur les navigations**, cache uniquement `/_next/static/*` (hachés, immuables) et les icônes. Nom de cache versionné, `skipWaiting()` + `clients.claim()`. Un `sw.js` de secours réduit à `unregister()` est préparé : un mauvais SW sur une PWA iOS installée est très pénible à purger autrement. |
| PWA iOS | La PWA installée a **son propre bocal à cookies** — vous vous connecterez une fois dans Safari et une fois dans l'app, ce n'est pas un bug. `100dvh`, `env(safe-area-inset-*)`, champs à 16px. |
| Supabase gratuit | Pause après 7 jours d'inactivité (sans effet en usage quotidien, à savoir avant deux semaines de vacances). Pas de sauvegarde → export JSON livré en phase 6. |
| Clé `service_role` fuitée dans le bundle | `import 'server-only'` : l'erreur est à la compilation. |
| Couvertures de livres | Bucket **public** à noms UUID plutôt que privé + URL signées : sans rôle `authenticated`, les URL signées expirent et cassent le cache de `next/image`. Une couverture de livre n'est pas un secret. |
| Types générés | `supabase gen types typescript` commité, pas écrit à la main — sinon dérive silencieuse entre migration et types. Les colonnes de vues sortent `| null` : normalisées dans `lib/donnees/`, pas de `!` dans les composants. |
| Ampleur | Si le temps manque, la coupe se fait sur **le nombre de widgets** (le registre rend l'ajout trivial ensuite) et les écrans Cours/Clients — jamais sur les migrations, le fuseau, ni `0009_lockdown`, qui sont les trois choses pénibles à rattraper après coup. |
