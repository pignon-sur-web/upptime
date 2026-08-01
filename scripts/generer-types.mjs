/*
 * Génère src/lib/supabase/database.types.ts en interrogeant le schéma réel.
 *
 * Le CLI Supabase fait normalement ce travail, mais il passe par Docker, et
 * les images sont inaccessibles depuis cet environnement. Écrire les types à
 * la main serait la pire option : ils dériveraient silencieusement des
 * migrations à la première évolution du schéma. Ce générateur les dérive de la
 * base elle-même, donc la dérive est structurellement impossible.
 *
 *   node scripts/generer-types.mjs
 *   node scripts/generer-types.mjs "postgresql://…"    # contre Supabase
 *
 * Une colonne de VUE ressort toujours nullable : Postgres ne peut pas prouver
 * le contraire. C'est fidèle, et les fonctions de src/lib/donnees/ normalisent.
 */

import { writeFile } from 'node:fs/promises'
import pg from 'pg'

const URL_BASE =
  process.argv[2] ?? 'postgresql://postgres@127.0.0.1:5433/cerveau'

/** Types Postgres → types TypeScript. Tout le reste tombe sur `string`. */
const CORRESPONDANCES = {
  bool: 'boolean',
  int2: 'number',
  int4: 'number',
  int8: 'number',
  float4: 'number',
  float8: 'number',
  numeric: 'number',
  json: 'Json',
  jsonb: 'Json',
  uuid: 'string',
  text: 'string',
  varchar: 'string',
  bpchar: 'string',
  date: 'string',
  timestamp: 'string',
  timestamptz: 'string',
  time: 'string',
  interval: 'string',
  tsvector: 'unknown',
}

function versTS(typePg) {
  if (typePg.startsWith('_')) return `${versTS(typePg.slice(1))}[]`
  return CORRESPONDANCES[typePg] ?? 'string'
}

const client = new pg.Client({ connectionString: URL_BASE })
await client.connect()

// Colonnes des tables et des vues. `attnotnull` et la présence d'un défaut
// déterminent ce qui est facultatif à l'insertion.
const { rows: colonnes } = await client.query(`
  select
    c.relname                         as relation,
    c.relkind                         as genre,        -- 'r' table, 'v' vue
    a.attname                         as colonne,
    t.typname                         as type_pg,
    a.attnotnull                      as obligatoire,
    (d.adbin is not null)             as a_defaut,
    a.attidentity <> ''               as identite,
    a.attgenerated <> ''              as generee
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_type t on t.oid = a.atttypid
  left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
  where n.nspname = 'public'
    and c.relkind in ('r', 'v')
    and a.attnum > 0
    and not a.attisdropped
  order by c.relname, a.attnum
`)

// Clés étrangères. supabase-js exige une clé `Relationships` sur chaque table
// et chaque vue : sans elle, le type ne satisfait pas GenericTable et tout se
// replie silencieusement sur `never`. Elles servent aussi à typer les
// jointures imbriquées de .select('*, table(*)').
const { rows: relations_fk } = await client.query(`
  select
    con.conname                                  as nom,
    src.relname                                  as source,
    cible.relname                                as cible,
    array_agg(ac.attname::text order by u.ord)         as colonnes,
    array_agg(af.attname::text order by u.ord)         as colonnes_cible,
    exists (
      select 1 from pg_index i
      where i.indrelid = con.conrelid
        and i.indisunique
        and i.indkey::int2[] @> con.conkey
        and array_length(con.conkey, 1) = i.indnatts
    )                                            as un_vers_un
  from pg_constraint con
  join pg_class src on src.oid = con.conrelid
  join pg_class cible on cible.oid = con.confrelid
  join pg_namespace n on n.oid = src.relnamespace
  join lateral unnest(con.conkey, con.confkey) with ordinality as u(ck, fk, ord) on true
  join pg_attribute ac on ac.attrelid = con.conrelid and ac.attnum = u.ck
  join pg_attribute af on af.attrelid = con.confrelid and af.attnum = u.fk
  where con.contype = 'f' and n.nspname = 'public'
  group by con.conname, src.relname, cible.relname, con.conrelid, con.conkey
  order by src.relname, con.conname
`)

// Fonctions appelables par .rpc()
const { rows: fonctions } = await client.query(`
  select
    p.proname as nom,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid)    as retour,
    p.prorettype::regtype::text      as type_retour,
    p.proretset                      as ensemble
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'
    and p.proname not like 'tg\\_%'
  order by p.proname
`)

await client.end()

const relations = new Map()
for (const c of colonnes) {
  if (!relations.has(c.relation)) {
    relations.set(c.relation, { genre: c.genre, colonnes: [] })
  }
  relations.get(c.relation).colonnes.push(c)
}

const lignes = []
lignes.push('// Généré par scripts/generer-types.mjs — ne pas modifier à la main.')
lignes.push('//')
lignes.push('// Régénérer après toute migration :')
lignes.push('//   node scripts/generer-types.mjs')
lignes.push('')
lignes.push('export type Json =')
lignes.push('  | string')
lignes.push('  | number')
lignes.push('  | boolean')
lignes.push('  | null')
lignes.push('  | { [cle: string]: Json | undefined }')
lignes.push('  | Json[]')
lignes.push('')
lignes.push('export type Database = {')
lignes.push('  public: {')

// — Tables et vues ————————————————————————————————————————————————
lignes.push('    Tables: {')
for (const [nom, { genre, colonnes: cols }] of relations) {
  if (genre !== 'r') continue
  lignes.push(`      ${nom}: {`)

  lignes.push('        Row: {')
  for (const c of cols) {
    lignes.push(`          ${c.colonne}: ${versTS(c.type_pg)}${c.obligatoire ? '' : ' | null'}`)
  }
  lignes.push('        }')

  lignes.push('        Insert: {')
  for (const c of cols) {
    // Facultatif si un défaut existe, si la colonne est générée, ou si elle
    // accepte null.
    const facultatif = c.a_defaut || c.identite || c.generee || !c.obligatoire
    if (c.generee) continue // une colonne générée ne s'écrit jamais
    lignes.push(
      `          ${c.colonne}${facultatif ? '?' : ''}: ${versTS(c.type_pg)}${c.obligatoire ? '' : ' | null'}`,
    )
  }
  lignes.push('        }')

  lignes.push('        Update: {')
  for (const c of cols) {
    if (c.generee) continue
    lignes.push(
      `          ${c.colonne}?: ${versTS(c.type_pg)}${c.obligatoire ? '' : ' | null'}`,
    )
  }
  lignes.push('        }')

  lignes.push(...bloqueRelations(nom))
  lignes.push('      }')
}
lignes.push('    }')

lignes.push('    Views: {')
for (const [nom, { genre, colonnes: cols }] of relations) {
  if (genre !== 'v') continue
  lignes.push(`      ${nom}: {`)
  lignes.push('        Row: {')
  for (const c of cols) {
    // Postgres ne peut pas prouver la non-nullité d'une colonne de vue.
    lignes.push(`          ${c.colonne}: ${versTS(c.type_pg)} | null`)
  }
  lignes.push('        }')
  lignes.push(...bloqueRelations(nom))
  lignes.push('      }')
}
lignes.push('    }')

// — Fonctions ——————————————————————————————————————————————————————
lignes.push('    Functions: {')
for (const f of fonctions) {
  const args = analyserArguments(f.arguments)
  lignes.push(`      ${f.nom}: {`)
  if (args.length === 0) {
    lignes.push('        Args: Record<string, never>')
  } else {
    lignes.push('        Args: {')
    for (const a of args) {
      lignes.push(`          ${a.nom}${a.facultatif ? '?' : ''}: ${versTS(a.type)}`)
    }
    lignes.push('        }')
  }
  lignes.push(`        Returns: ${typeRetour(f)}`)
  lignes.push('      }')
}
lignes.push('    }')

lignes.push('    Enums: Record<string, never>')
lignes.push('    CompositeTypes: Record<string, never>')
lignes.push('  }')
lignes.push('}')
lignes.push('')

/** Bloc `Relationships` d'une table ou d'une vue, au format attendu par supabase-js. */
function bloqueRelations(relation) {
  const siennes = relations_fk.filter((r) => r.source === relation)
  if (siennes.length === 0) return ['        Relationships: []']

  const sortie = ['        Relationships: [']
  for (const r of siennes) {
    sortie.push('          {')
    sortie.push(`            foreignKeyName: ${JSON.stringify(r.nom)}`)
    sortie.push(`            columns: ${JSON.stringify(r.colonnes)}`)
    sortie.push(`            isOneToOne: ${r.un_vers_un}`)
    sortie.push(`            referencedRelation: ${JSON.stringify(r.cible)}`)
    sortie.push(`            referencedColumns: ${JSON.stringify(r.colonnes_cible)}`)
    sortie.push('          },')
  }
  sortie.push('        ]')
  return sortie
}

/** « p_compte_id uuid, p_date date DEFAULT NULL » → liste structurée. */
function analyserArguments(signature) {
  if (!signature.trim()) return []
  return decouper(signature).map((brut) => {
    const morceau = brut.trim()
    const facultatif = / default /i.test(morceau)
    const sansDefaut = morceau.split(/ default /i)[0].trim()
    const [nom, ...reste] = sansDefaut.split(/\s+/)
    return { nom, type: normaliser(reste.join(' ')), facultatif }
  })
}

/** Découpe sur les virgules de premier niveau (les types peuvent en contenir). */
function decouper(signature) {
  const morceaux = []
  let courant = ''
  let profondeur = 0
  for (const caractere of signature) {
    if (caractere === '(') profondeur++
    if (caractere === ')') profondeur--
    if (caractere === ',' && profondeur === 0) {
      morceaux.push(courant)
      courant = ''
    } else {
      courant += caractere
    }
  }
  if (courant.trim()) morceaux.push(courant)
  return morceaux
}

/** Noms SQL lisibles → noms internes de pg_type. */
function normaliser(type) {
  const base = type.toLowerCase().replace(/\(.*\)/, '').trim()
  const tableau = base.endsWith('[]')
  const nu = tableau ? base.slice(0, -2).trim() : base
  const table = {
    'uuid': 'uuid',
    'text': 'text',
    'date': 'date',
    'boolean': 'bool',
    'integer': 'int4',
    'smallint': 'int2',
    'bigint': 'int8',
    'numeric': 'numeric',
    'timestamp with time zone': 'timestamptz',
    'timestamp without time zone': 'timestamp',
    'character varying': 'varchar',
    'character': 'bpchar',
    'json': 'json',
    'jsonb': 'jsonb',
    'double precision': 'float8',
    'real': 'float4',
  }
  const interne = table[nu] ?? nu
  return tableau ? `_${interne}` : interne
}

function typeRetour(f) {
  // Une fonction qui renvoie TABLE(...) donne un tableau d'objets.
  const correspondance = f.retour.match(/^TABLE\((.*)\)$/is)
  if (correspondance) {
    const champs = decouper(correspondance[1]).map((brut) => {
      const [nom, ...reste] = brut.trim().split(/\s+/)
      return `${nom}: ${versTS(normaliser(reste.join(' ')))} | null`
    })
    return `{ ${champs.join('; ')} }[]`
  }
  const base = versTS(normaliser(f.retour))
  if (f.ensemble) return `${base}[]`
  // Toute fonction SQL scalaire peut renvoyer NULL — completer_tache le fait
  // volontairement quand la tâche est déjà faite. Le taire ici obligerait à
  // mentir au bord.
  return `${base} | null`
}

const sortie = 'src/lib/supabase/database.types.ts'
await writeFile(sortie, lignes.join('\n'))
console.log(
  `${sortie} — ${[...relations.values()].filter((r) => r.genre === 'r').length} tables, ` +
    `${[...relations.values()].filter((r) => r.genre === 'v').length} vues, ` +
    `${fonctions.length} fonctions`,
)
