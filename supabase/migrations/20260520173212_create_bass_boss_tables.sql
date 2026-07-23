/*
  # Bass Boss — Initial Schema

  1. New Tables
    - `tournaments`
      - `id` (uuid, primary key)
      - `name` (text) — tournament display name
      - `date` (date) — scheduled date
      - `lake_id` (text) — lake identifier from client data
      - `lake_name` (text) — denormalized lake name for display
      - `created_at` (timestamptz)
    - `teams`
      - `id` (uuid, primary key)
      - `name` (text, unique) — team name
      - `created_at` (timestamptz)
    - `team_members`
      - `id` (uuid, primary key)
      - `team_id` (uuid, FK → teams)
      - `name` (text) — member display name
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on all three tables
    - Public read access for tournaments and teams (club-wide visibility)
    - Authenticated insert/update/delete for tournaments and teams
    - Authenticated insert/delete for team_members
*/

CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  date date,
  lake_id text NOT NULL DEFAULT '',
  lake_name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tournaments"
  ON tournaments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tournaments"
  ON tournaments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tournaments"
  ON tournaments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tournaments"
  ON tournaments FOR DELETE
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view teams"
  ON teams FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update teams"
  ON teams FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete teams"
  ON teams FOR DELETE
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view team members"
  ON team_members FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert team members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete team members"
  ON team_members FOR DELETE
  TO authenticated
  USING (true);
