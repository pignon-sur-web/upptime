-- 0009 — Verrouillage. À exécuter EN DERNIER.
--
-- C'est la frontière de sécurité de la base. Ne pas la sauter.
--
-- Contexte : l'application n'utilise pas Supabase Auth. Il n'y a donc aucun
-- utilisateur connu de Postgres, et la RLS ne peut s'appuyer sur aucun
-- auth.uid(). La protection est ailleurs :
--
--   1. le middleware refuse toute requête sans cookie de session signé ;
--   2. chaque table a la RLS activée SANS AUCUNE POLICY, ce qui mure la clé
--      anonyme au niveau des lignes ;
--   3. cette migration retire explicitement les droits, ce que la RLS seule ne
--      fait pas — elle ne couvre ni les vues ni les fonctions.
--
-- Supabase accorde par défaut SELECT sur le schéma public aux rôles anon et
-- authenticated. Sans les révocations ci-dessous, les vues de 0007 resteraient
-- atteignables.
--
-- La clé service_role possède BYPASSRLS et n'est pas concernée : le code
-- serveur continue de fonctionner à l'identique.

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all routines  in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Sans ceci, toute table créée plus tard rouvrirait la brèche.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on routines  from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- —————————————————————————————————————————————————————————————————
-- Vérification, à lancer après coup depuis un terminal.
-- Les trois doivent renvoyer une erreur de permission ou une liste vide :
--
--   curl "$SUPABASE_URL/rest/v1/solde_compte?select=*"  -H "apikey: $ANON"
--   curl "$SUPABASE_URL/rest/v1/transactions?select=*"  -H "apikey: $ANON"
--   curl "$SUPABASE_URL/rest/v1/notes?select=*"         -H "apikey: $ANON"
--
-- Si solde_compte renvoie des données, c'est que le security_invoker de 0007
-- n'a pas été appliqué.
-- —————————————————————————————————————————————————————————————————
