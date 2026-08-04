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
| Emoji des habitudes | **Conservés en couleur** — seule entorse assumée au monochrome. |
| Portée | **Les 5 phases**, en une session, un commit par phase. |

### Où vit réellement le code — révisé en cours de route

Le dépôt dédié n'a pas pu être créé : l'intégration GitHub de la session n'a
pas le droit de créer des dépôts, et un dépôt personnel ne peut pas être
rattaché à une session liée à `pignon-sur-web`. Décision retenue avec vous :

**Le travail vit dans `pignon-sur-web/upptime`, branche
`claude/deuxieme-cerveau-specs-t8t7ug`, sous-dossier `deuxieme-cerveau/`.**
Aucun fichier Upptime n'est modifié, le monitoring continue. Le code déménagera
vers son dépôt définitif plus tard (`git subtree split`, ou simple copie).

---

## État au moment de la reprise

| | |
|---|---|
| **Phase 1 — fondations** | Faite, **vérifiée à 23/23 au navigateur**. |
| **Schéma SQL complet** | Les 9 migrations écrites, appliquées sur un Postgres 16 réel, **23/23 contrôles de logique**, dont les 3 de sécurité. |
| **Phase 2 — habitudes** | Livrée. Compile, typée, lint propre. **Non vérifiée à l'exécution.** |
| **Phases 3 à 5** | À faire. |

Quatre commits poussés. `PLAN.md` et `README.md` sont dans le sous-dossier.

### La contrainte qui commande tout le reste

**Cette session ne peut pas joindre Supabase.** La politique réseau de
l'environnement refuse `*.supabase.co` (403 au CONNECT), et Docker est bloqué
de la même façon, ce qui a fait échouer la pile Supabase locale. La politique
étant fixée à la création de la session, elle ne changera pas ici.

Conséquence assumée : **les phases 3 à 5 se construisent sans vérification à
l'exécution.** Ce qui reste vérifiable ici, et qui sera fait à chaque phase :

- `npm run typecheck`, `npm run lint`, `npm run build` ;
- `npm run verifier:sql` — les migrations et toute la logique calculée sur un
  Postgres 16 local, ce qui couvre la partie la plus risquée (récurrences,
  soldes, rapprochements, verrouillage) ;
- relecture des requêtes contre les types générés du schéma réel.

Ce qui **ne peut pas** l'être : l'aller-retour supabase-js ↔ PostgREST, et donc
tout comportement d'écran. Cette dette se solde dans un environnement dont la
politique réseau autorise `*.supabase.co`, `*.supabase.com` et `api.supabase.com`.

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

Ce que la DA interdit **n'existera pas dans Tailwind**. `src/app/globals.css` :

```css
@import "tailwindcss";

:root { --fond:#FBFBF9; --texte:#0A0A0B; --secondaire:#75757C; --trait:#E6E6E2; }
@media (prefers-color-scheme: dark) {
  :root { --fond:#0E0E10; --texte:#FBFBF9; --secondaire:#75757C; --trait:#232327; }
}

@theme inline {
  --color-fond: var(--fond);
  --color-texte: var(--texte);          /* Encre : texte ET remplissage */
  --color-secondaire: var(--secondaire);
  --color-trait: var(--trait);

  --font-sans: var(--police-inter-tight), ui-sans-serif, system-ui;
  --font-mono: var(--police-geist-mono), ui-monospace, monospace;

  --text-11:11px; --text-13:13px; --text-15:15px;
  --text-18:18px; --text-24:24px; --text-40:40px; --text-72:72px;

  --radius-*: initial;   /* rounded-* cesse d'exister */
  --shadow-*: initial;   /* shadow-*  cesse d'exister */
  --color-red-*: initial; --color-green-*: initial; /* … toutes les palettes */
}
```

`@theme inline` fait pointer les utilitaires sur la variable et non sur sa valeur :
la bascule clair/sombre tient dans la seule media query, sans classe `dark:`.

**Piège Tailwind v4 à traiter dès la phase 1 :** la couleur de bordure par défaut
est passée de `gray-200` à `currentColor`. Dans un design entièrement fait de
filets, chaque `border` rendrait du noir pur. Règle : toujours `border-trait`,
jamais `border` seul. Une règle ESLint le vérifie.

Reste : polices `next/font/google` auto-hébergées ; marge `px-5` ; grille 8px ;
transition unique `120ms ease-out` neutralisée sous `prefers-reduced-motion` ;
case cochée en `scale(0)→scale(1)`, `transform-origin: center`, donc remplie du
centre vers les bords ; tous les nombres en `font-mono` ; libellés de widget en
`text-11 uppercase tracking-[0.08em] text-secondaire`.

Discipline iOS obligatoire, `input, select, textarea { font-size: 16px }` — en
dessous, Safari zoome le viewport à la mise au point et n'en revient jamais.

### Le mur du mois

SVG à la main, une case par jour **du mois réel** (28 à 31), sur **7 colonnes
alignées sur les jours de la semaine** plutôt qu'un bloc de 30 : à encombrement
égal, l'alignement hebdomadaire fait ressortir le motif des week-ends.

Case = carré bordé en Trait ; le score est un `<rect>` plein en Encre **monté
depuis le bas**, hauteur `palier/5` avec `palier = ceil(score × 5)`. Pas
d'opacité, pas de gris, pas de gradient : un remplissage littéral.

Un jour sans aucune habitude programmée rend `score = null` → tiret, pas zéro.
« Rien ne vous était demandé » n'est pas « vous avez échoué ».

---

## Navigation

Barre basse **texte seul, sans icône** — un glyphe monochrome 1px à 24px est
ambigu, un mot ne l'est pas, et c'est plus proche de l'esprit du brief.
Quatre créneaux de ~97 × 52px (+ `env(safe-area-inset-bottom)`), donc bien
au-delà des 44px :

`Accueil · Tâches · Argent · Tout`

Les habitudes ne prennent pas de créneau : elles se cochent depuis le tableau de
bord, qui est déjà l'écran d'accueil. **Tout** ouvre un panneau plein écran
listant les 13 sections en lignes de 56px, **les plus utilisées en bas** — c'est
là que le pouce arrive — et fermé par une ligne « Fermer » en bas, elle aussi
atteignable.

Actif = filet supérieur 2px + graisse 600. Section courante dans le panneau =
inversion complète (fond Encre, texte Papier). L'inversion est le seul
surlignage dont dispose un système monochrome : on ne le dépense qu'une fois.

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

## Ce qui reste à faire — phases 3 à 5

Un commit par phase, relisible et révocable isolément. Chaque phase suit le même
patron, déjà en place et à réutiliser tel quel plutôt qu'à réinventer :

- lectures dans `src/lib/donnees/<domaine>.ts`, chaque export enveloppé dans
  `cache()` (modèle : `src/lib/donnees/habitudes.ts`) ;
- écritures dans `src/lib/actions/<domaine>.ts`, `'use server'`, chacune
  ouvrant sur `exigerSession()` puis fermant sur `revalidatePath()` — et
  **aucune constante exportée**, un tel fichier ne peut exporter que des
  fonctions asynchrones (les constantes vont dans `src/lib/regles.ts`) ;
- écran sous `src/app/(app)/<section>/page.tsx`, l'état porté par les
  paramètres d'URL quand c'est possible, pour rester utilisable sans JavaScript ;
- widgets dans `src/components/widgets/`, inscrits dans `registre.tsx`, chacun
  rendant `null` quand il est vide ;
- primitives existantes à réutiliser : `<Widget>` et `<Invitation>`, `<Case>`,
  `<Jauge>`, `<Ligne>` (qui porte déjà le trait vertical 2px des retards),
  `<EnTeteSection>`.

Toute la logique délicate est **déjà en base et déjà vérifiée** : `completer_tache`,
`passer_tache`, `enregistrer_virement`, `supprimer_virement`,
`enregistrer_ajustement`, `payer_echeance`, et les vues `solde_compte`,
`avancement_projet`, `progression_objectif`, `finances_mensuelles`,
`depenses_par_categorie`, `budget_statut`. Les écrans ne doivent que les
appeler, jamais refaire le calcul côté TypeScript.

### Phase 3 — Tâches et projets

Écrans `taches/` (Aujourd'hui + retards, 7 prochains jours groupés, Toutes
filtrable), `taches/importer/`, `projets/`. Report en un tap (demain / semaine
prochaine), sous-tâches à un niveau, complétion via `completer_tache`.
Widgets : Tâches du jour, Retards, 7 prochains jours, Projets en cours.

**Import CSV** — `src/lib/csv.ts`, analyseur RFC 4180 écrit à la main
(guillemets, séparateurs et retours à la ligne encapsulés), détection du
séparateur `,` `;` ou tabulation, et parcours en quatre étapes : dépôt →
association des colonnes pré-remplie par correspondance approximative → aperçu
des dix premières lignes sans rien écrire → import. Format de date deviné puis
modifiable, `JJ/MM/AAAA` par défaut. Chaque lot porte un `import_batch_id`,
donc un import raté se défait d'une tape.

### Phase 4 — Finances

Écrans `argent/` (total net et solde par compte), `argent/comptes/[id]`,
`argent/rapprocher/[id]`, `argent/virement`, `argent/echeances`,
`argent/budgets`. Saisie de transaction en moins de cinq secondes.
`src/lib/argent.ts` pour l'analyse (`1 234,56` comme `1234.56`) et le formatage
en `Intl.NumberFormat('fr-BE')`. Barres SVG horizontales écrites à la main pour
les dépenses par catégorie. Dépassement de budget rendu par inversion de ligne.
Widgets : Comptes, Le mois en argent, Paiements à venir.

Le rapprochement affiche l'écart en direct pendant la saisie, mais **c'est le
serveur qui fait foi** : il recalcule et renvoie l'écart réel. Écart nul → « Déjà
à jour », aucune ligne. Les lignes d'ajustement ne sont pas modifiables.

### Phase 5a — Agenda, objectifs, journal

Agenda en vues semaine et mois, les tâches datées y apparaissent en lecture
seule. Objectifs et résultats clés avec progression calculée par la base.
Journal du jour prérempli par le score d'habitudes et les tâches terminées,
bilans hebdomadaire et mensuel dérivés des entrées.
Widgets : Agenda, Objectifs en cours.

### Phase 5b — Le reste

Inbox (un champ, un bouton) et conversion en tâche / note / dépense /
événement. Sport, Lectures avec upload de couverture vers le bucket
`couvertures`, Notes avec recherche plein texte française, Cours, Clients avec
alerte au-delà de 30 jours sans contact. Panneau de réglage des widgets
(activer, désactiver, réordonner). **Export JSON** dans `reglages/export` —
l'offre gratuite Supabase n'a aucune sauvegarde automatique, et ce serait
l'unique copie d'une année de journal.

### Données de démonstration

Le brief interdit toute donnée en dur *dans les composants* — respecté
strictement. Un `supabase/seed.sql` facultatif, exécuté à la main, permet de
regarder l'application remplie. Aucun composant n'en dépend.

### Performance

`export const preferredRegion = 'fra1'` + projet Supabase en `eu-central-1`.
C'est la ligne de configuration la plus rentable du projet : elle fait passer
chaque requête de ~90 ms à ~4 ms et rend la question du nombre de requêtes du
tableau de bord largement théorique. Chaque widget reste un composant serveur
autonome sous son propre `<Suspense>`, ses lectures enveloppées dans `cache()`
(dédoublonnage inter-widgets) et groupées en `Promise.all` à l'intérieur.

---

## Vérification

### Dans cette session, à chaque phase

- `npm run verifier` — `tsc --noEmit`, `eslint`, `next build`.
- `npm run verifier:sql` — les 9 migrations sur une base neuve plus les
  contrôles de logique. **Chaque phase y ajoute les siens** : report de tâche,
  sous-tâches, import et annulation d'un lot, saisie de transaction,
  rapprochement, paiement d'échéance, budgets, progression d'objectif,
  recherche plein texte. C'est la seule vérification de comportement possible
  ici, et elle couvre la partie la plus risquée.
- Grep de non-régression : aucun `current_date` en SQL, aucun
  `toISOString().slice` en TypeScript.
- Régénérer `src/lib/supabase/database.types.ts` (`npm run types`) après toute
  migration, et vérifier que les écrans compilent contre les nouveaux types.

### Dans un environnement au réseau autorisé

Ce qui reste en dette et se solde là-bas :

1. Appliquer les 9 migrations, créer le bucket public `couvertures`.
2. `npm run verifier:parcours` — les 23 contrôles de la phase 1 doivent
   repasser au vert contre la vraie base.
3. Parcours réels : cocher une habitude à 23h55 heure belge et vérifier
   qu'elle tombe le bon jour ; compléter une tâche récurrente en retard ;
   rapprocher un solde ; faire puis supprimer un virement ; importer un CSV à
   point-virgule avec dates `JJ/MM/AAAA` puis annuler le lot.
4. Contrôle de sécurité avec la clé *anon* :
   `curl "$SUPABASE_URL/rest/v1/solde_compte?select=*" -H "apikey: $ANON"`
   doit refuser. S'il renvoie des données, le `security_invoker` de `0007`
   n'a pas pris.

### Déploiement Vercel, à la fin

Importer le dépôt, **Root Directory = `deuxieme-cerveau`** tant que le code vit
dans le sous-dossier d'upptime, région `fra1`, et les quatre variables :
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_PASSWORD`, `AUTH_SECRET`.

⚠️ La clé `sb_secret_…` communiquée dans la conversation doit être **révoquée**
(Supabase → Project Settings → API Keys → *Rotate*). Elle n'a jamais servi,
l'environnement n'ayant pas pu joindre Supabase.

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
