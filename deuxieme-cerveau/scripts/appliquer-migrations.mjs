/*
 * Applique les migrations sur le projet Supabase, par l'API de gestion.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_… node scripts/appliquer-migrations.mjs <ref-projet>
 *   node scripts/appliquer-migrations.mjs --concatener > /tmp/tout.sql
 *
 * Pourquoi l'API de gestion et non `psql` : le port Postgres n'est pas
 * joignable depuis tous les environnements — un conteneur d'exécution ne laisse
 * souvent sortir que le HTTPS. L'API, elle, passe par le proxy comme le reste.
 *
 * Le jeton se crée sur supabase.com/dashboard/account/tokens. Ce n'est pas la
 * clé `service_role` : celle-ci ne donne accès qu'à PostgREST, qui ne sait pas
 * exécuter de DDL.
 *
 * Chaque fichier est envoyé entier, dans l'ordre des numéros, et le script
 * s'arrête à la première erreur — une base à moitié migrée est le pire état
 * possible, autant s'arrêter là où on le sait.
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const DOSSIER = 'supabase/migrations'

async function migrations() {
  const fichiers = (await readdir(DOSSIER)).filter((f) => f.endsWith('.sql')).sort()
  return Promise.all(
    fichiers.map(async (nom) => ({
      nom,
      sql: await readFile(join(DOSSIER, nom), 'utf8'),
    })),
  )
}

const arguments_ = process.argv.slice(2)

// Mode repli : produire un fichier unique à coller dans l'éditeur SQL.
if (arguments_.includes('--concatener')) {
  const liste = await migrations()
  const parties = liste.map(
    (m) =>
      `-- ═══════════════════════════════════════════════════════════════\n` +
      `-- ${m.nom}\n` +
      `-- ═══════════════════════════════════════════════════════════════\n\n${m.sql}`,
  )
  process.stdout.write(parties.join('\n\n'))
  process.exit(0)
}

const jeton = process.env.SUPABASE_ACCESS_TOKEN
const ref = arguments_[0] ?? process.env.SUPABASE_PROJECT_REF

if (!jeton || !ref) {
  console.error(
    'Utilisation : SUPABASE_ACCESS_TOKEN=sbp_… node scripts/appliquer-migrations.mjs <ref-projet>',
  )
  process.exit(2)
}

async function executer(sql) {
  const reponse = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jeton}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    },
  )

  const corps = await reponse.text()
  if (!reponse.ok) {
    throw new Error(`${reponse.status} — ${corps.slice(0, 600)}`)
  }
  return corps
}

const liste = await migrations()
console.log(`→ ${liste.length} migrations sur le projet ${ref}`)

for (const { nom, sql } of liste) {
  process.stdout.write(`   ${nom.padEnd(28)}`)
  try {
    await executer(sql)
    console.log('ok')
  } catch (souci) {
    console.log('ECHEC')
    console.error(`\n${souci.message}\n`)
    process.exit(1)
  }
}

// Contrôle de bon sens : les tables et les vues doivent être là.
const inventaire = await executer(`
  select
    (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r') as tables,
    (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'v') as vues,
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public') as fonctions,
    public.app_today() as app_today
`)

console.log(`\n→ inventaire : ${inventaire}`)
console.log('→ migrations appliquées.')
