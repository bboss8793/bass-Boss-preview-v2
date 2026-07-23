-- Drop the authenticated-only write policies and replace with anon-inclusive ones

-- boats
DROP POLICY IF EXISTS "Authenticated users can insert boats" ON boats;
DROP POLICY IF EXISTS "Authenticated users can update boats" ON boats;
DROP POLICY IF EXISTS "Authenticated users can delete boats" ON boats;

CREATE POLICY "Anyone can insert boats"
  ON boats FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update boats"
  ON boats FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete boats"
  ON boats FOR DELETE
  TO anon, authenticated
  USING (true);

-- catches
DROP POLICY IF EXISTS "Authenticated users can insert catches" ON catches;
DROP POLICY IF EXISTS "Authenticated users can update catches" ON catches;
DROP POLICY IF EXISTS "Authenticated users can delete catches" ON catches;

CREATE POLICY "Anyone can insert catches"
  ON catches FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update catches"
  ON catches FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete catches"
  ON catches FOR DELETE
  TO anon, authenticated
  USING (true);

-- tournament_state
DROP POLICY IF EXISTS "Authenticated users can insert tournament state" ON tournament_state;
DROP POLICY IF EXISTS "Authenticated users can update tournament state" ON tournament_state;
DROP POLICY IF EXISTS "Authenticated users can delete tournament state" ON tournament_state;

CREATE POLICY "Anyone can insert tournament state"
  ON tournament_state FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update tournament state"
  ON tournament_state FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete tournament state"
  ON tournament_state FOR DELETE
  TO anon, authenticated
  USING (true);
