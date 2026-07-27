/*
# Fix RLS policies and GRANTs on tournaments, boats, catches

The tournaments, boats, and catches tables had RLS enabled but NO policies,
and were missing INSERT/SELECT/UPDATE/DELETE grants for anon and authenticated
roles. This caused "permission denied for table tournaments" when trying to
create tournaments. The teams and access_requests tables work because they
have full CRUD policies and grants — this migration brings the three broken
tables to the same standard.

## Changes per table:

### tournaments
- GRANT SELECT, INSERT, UPDATE, DELETE to anon, authenticated
- 4 RLS policies (select/insert/update/delete) with USING(true) / WITH CHECK(true)
  (no-auth app pattern — the frontend uses the anon key)

### boats
- GRANT SELECT, INSERT, UPDATE, DELETE to anon, authenticated
- 4 RLS policies (select/insert/update/delete)

### catches
- GRANT SELECT, INSERT, UPDATE, DELETE to anon, authenticated
- 4 RLS policies (select/insert/update/delete)

All policies use TO anon, authenticated with USING(true)/WITH CHECK(true)
because this is a no-auth app where the frontend operates with the anon key
and all tournament data is intentionally shared.
*/

-- ─── tournaments ────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON tournaments TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_tournaments" ON tournaments;
CREATE POLICY "anon_select_tournaments" ON tournaments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_tournaments" ON tournaments;
CREATE POLICY "anon_insert_tournaments" ON tournaments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_tournaments" ON tournaments;
CREATE POLICY "anon_update_tournaments" ON tournaments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_tournaments" ON tournaments;
CREATE POLICY "anon_delete_tournaments" ON tournaments FOR DELETE
  TO anon, authenticated USING (true);

-- ─── boats ───────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON boats TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_boats" ON boats;
CREATE POLICY "anon_select_boats" ON boats FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_boats" ON boats;
CREATE POLICY "anon_insert_boats" ON boats FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_boats" ON boats;
CREATE POLICY "anon_update_boats" ON boats FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_boats" ON boats;
CREATE POLICY "anon_delete_boats" ON boats FOR DELETE
  TO anon, authenticated USING (true);

-- ─── catches ─────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON catches TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_catches" ON catches;
CREATE POLICY "anon_select_catches" ON catches FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_catches" ON catches;
CREATE POLICY "anon_insert_catches" ON catches FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_catches" ON catches;
CREATE POLICY "anon_update_catches" ON catches FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_catches" ON catches;
CREATE POLICY "anon_delete_catches" ON catches FOR DELETE
  TO anon, authenticated USING (true);
