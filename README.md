# Mon 2ᵉ Cerveau

Tableau de bord personnel mono-utilisateur, installable en PWA sur iPhone.
Habitudes, tâches, projets, finances, agenda, objectifs, journal, sport,
lectures, notes, cours, clients.

Next.js 15 (App Router) · TypeScript · Tailwind 4 · Supabase · Vercel.

---

## Mise en route

### 1. Supabase

Créer un projet sur [supabase.com](https://supabase.com), **région
`eu-central-1` (Frankfurt)** — la même que le déploiement Vercel, ce qui fait
passer chaque requête d'environ 90 ms à 4 ms.

Dans l'éditeur SQL, coller le contenu de `supabase/migrations/*.sql` **dans
l'ordre des numéros**. La migration `0009_verrouillage.sql` est la frontière de
sécurité : ne pas la sauter.

Créer ensuite un bucket Storage **public** nommé `couvertures` (les images de
couverture portent des noms UUID ; un bucket privé imposerait des URL signées
qui expirent et cassent le cache de `next/image`).

### 2. Variables d'environnement

```bash
cp .env.example .env.local
```

| Variable | Rôle |
|---|---|
| `SUPABASE_URL` | Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | idem. **Serveur uniquement**, contourne la RLS |
| `APP_PASSWORD` | le mot de passe d'accès, 24 caractères ou plus |
| `AUTH_SECRET` | secret de signature du cookie, aléatoire |

```bash
node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"   # AUTH_SECRET
```

### 3. Lancer

```bash
npm install
npm run dev
```

### 4. Déployer

Importer le dépôt sur Vercel, région **`fra1`**, et recopier les quatre
variables. Aucune configuration de sous-dossier : l'application est à la racine.

---

## Décisions structurantes

Elles sont documentées en détail dans les fichiers concernés ; voici pourquoi
elles existent.

**Pas de Supabase Auth.** Sur iOS, un magic link ouvre Safari et éjecte de la
PWA installée à chaque reconnexion. Pour une application qu'on ouvre chaque
soir, c'est la friction qui la fait abandonner. À la place : un mot de passe
unique et un cookie signé HMAC-SHA256 valable un an.

**Tout l'accès base est côté serveur**, avec la clé `service_role`. La base est
murée en trois couches : le middleware, la RLS activée sans aucune policy, et
les révocations explicites de `0009`. Cette dernière couche n'est pas
décorative : une vue Postgres s'exécute par défaut avec les droits de son
propriétaire, donc `solde_compte` aurait été lisible par la clé anonyme malgré
la RLS. Toutes les vues portent `security_invoker = true`.

**Le fuseau est centralisé.** `app_today()` en SQL, `aujourdhui()` en
TypeScript, tous deux en `Europe/Brussels`. Entre minuit et 2h du matin, UTC est
encore la veille : une habitude cochée à 00h30 tomberait sur le mauvais jour et
la série casserait au réveil. `current_date` est banni du schéma, et une règle
ESLint interdit de dériver un jour depuis `toISOString()`.

**L'argent est en centimes entiers.** PostgREST sérialise `numeric` en nombre
JSON : 19,99 ferait un aller-retour par un flottant. Toute colonne suffixée
`_cents` est un entier, et rien d'autre dans l'application n'est de l'argent.

**Les habitudes ont une fenêtre de dates**, pas un booléen `active`. Avec un
booléen, archiver une habitude en mars ferait passer rétroactivement toutes les
journées de janvier de 100 % à 66 %. Avec `started_on` / `archived_on`, rien de
ce qu'on fait aujourd'hui ne change le score d'hier.

**Les tâches récurrentes se génèrent à la complétion**, sans cron ni arriéré.
Chaque échéance se calcule depuis l'origine de la série et non par additions
successives, faute de quoi un loyer au 31 janvier finirait par déménager au 28.

**La direction artistique est imposée par l'outillage.** Les espaces de noms
Tailwind `--color-*`, `--radius-* `et `--shadow-*` sont vidés : `rounded-lg`,
`shadow-md` et `text-red-500` ne compilent plus. Les utilitaires statiques que
ce vidage ne couvre pas (`rounded-full`, `shadow`, `ring`) sont neutralisés par
une règle hors `@layer`, qui l'emporte dans la cascade. Seule échappatoire
connue : un utilitaire forcé (`rounded-full!`).

---

## Vérification

```bash
npm run verifier            # types, lint, build
npm run verifier:parcours   # 23 contrôles au navigateur (serveur lancé requis)
npm run verifier:da         # rayon et ombre réellement neutralisés
npm run verifier:sql        # migrations + logique calculée sur un Postgres jetable
npm run verifier:csv        # analyseur CSV sur ses cas limites
```

`verifier:sql` demande un Postgres local sur `/var/lib/pgtest:5433`. Il applique
les dix migrations sur une base neuve puis contrôle ce qui compte vraiment :
qu'archiver une habitude ne réécrit pas les scores passés, qu'une tâche
quotidienne en retard de huit jours ne produit qu'une occurrence, qu'un loyer
mensuel né le 31 ne dérive pas, qu'un virement laisse le net mensuel inchangé,
qu'un rapprochement de solde crée exactement l'écart, et qu'`anon` ne peut lire
aucune table ni aucune vue.

`verifier:csv` couvre l'analyseur : le point-virgule d'un export Excel
français, une virgule enfermée dans des guillemets, un titre multiligne, le
BOM, le 31 février refusé plutôt que replié sur le 3 mars, et le 3 avril qui ne
doit jamais devenir le 4 mars.

`verifier:parcours` couvre l'authentification — dont l'altération du cookie, qui
est ce qui prouve que la signature HMAC est réelle — les cibles tactiles, les
polices, les deux thèmes, et l'absence de redirection sur `/sw.js` (une
redirection y ferait échouer l'installation de la PWA sans message clair).

---

## Structure

```
supabase/migrations/   0001 socle · 0002 habitudes · 0003 travail
                       0004 finances · 0005 vie · 0006 widgets
                       0007 vues · 0008 fonctions · 0009 verrouillage
                       0010 import CSV
src/middleware.ts      la porte : cookie signé, matcher des exceptions PWA
src/lib/date.ts        le fuseau, source unique de « aujourd'hui »
src/lib/donnees/       lectures, enveloppées dans cache()
src/lib/actions/       écritures, 'use server'
src/components/ui/     primitives : Widget, Case, Jauge, Ligne
src/lib/csv.ts         analyseur RFC 4180, sans dépendance
src/components/graphiques/  SVG écrits à la main, aucune librairie
src/components/widgets/     les widgets du tableau de bord + leur registre
src/lib/argent.ts      centimes entiers, conversion aux deux bords seulement
src/app/(app)/reglages/export/  l'export JSON — Supabase gratuit ne sauvegarde pas
```
