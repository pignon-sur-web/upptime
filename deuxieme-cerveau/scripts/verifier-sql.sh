#!/usr/bin/env bash
#
# Applique les migrations sur un Postgres jetable et vérifie la logique
# calculée : scores d'habitudes, séries, récurrences, soldes, rapprochement.
#
# Le but est de ne jamais découvrir une erreur de schéma dans l'éditeur SQL de
# Supabase, où l'application est à moitié migrée et où il n'y a pas de retour
# arrière.
#
#   ./scripts/verifier-sql.sh
#
set -euo pipefail

SOCKET=${PGSOCKET:-/var/lib/pgtest}
PORT=${PGPORT:-5433}
BASE=${PGDATABASE:-cerveau}
PSQL="psql -h $SOCKET -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"

echo "→ base neuve"
$PSQL -d postgres -c "drop database if exists $BASE;" -c "create database $BASE;"

# Rôles fournis par Supabase, recréés pour que 0009 s'exécute tel quel.
$PSQL -d "$BASE" <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated;
-- Reproduit le défaut Supabase : anon reçoit SELECT sur le schéma public.
-- C'est précisément ce que la migration 0009 doit reprendre.
alter default privileges in schema public grant select on tables to anon, authenticated;
SQL

echo "→ migrations"
for f in supabase/migrations/*.sql; do
  printf '   %-28s' "$(basename "$f")"
  $PSQL -d "$BASE" -f "$f" >/dev/null
  echo "ok"
done

echo "→ contrôles"
$PSQL -d "$BASE" -f scripts/controles-sql.sql
