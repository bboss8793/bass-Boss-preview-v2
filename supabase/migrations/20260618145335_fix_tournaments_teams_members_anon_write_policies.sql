-- tournaments
DROP POLICY IF EXISTS "Authenticated users can insert tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can update tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can delete tournaments" ON tournaments;

CREATE POLICY "Anyone can insert tournaments"
  ON tournaments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update tournaments"
  ON tournaments FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete tournaments"
  ON tournaments FOR DELETE
  TO anon, authenticated
  USING (true);

-- teams
DROP POLICY IF EXISTS "Authenticated users can insert teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can update teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can delete teams" ON teams;

CREATE POLICY "Anyone can insert teams"
  ON teams FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update teams"
  ON teams FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete teams"
  ON teams FOR DELETE
  TO anon, authenticated
  USING (true);

-- team_members
DROP POLICY IF EXISTS "Authenticated users can insert team members" ON team_members;
DROP POLICY IF EXISTS "Authenticated users can delete team members" ON team_members;

CREATE POLICY "Anyone can insert team members"
  ON team_members FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update team members"
  ON team_members FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete team members"
  ON team_members FOR DELETE
  TO anon, authenticated
  USING (true);
