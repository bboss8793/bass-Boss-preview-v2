/*
  # Bass Boss Team Edition — Extended Schema

  1. New Tables
    - `boats`
      - `id` (uuid, primary key)
      - `team_id` (uuid, FK → teams)
      - `name` (text) — boat/captain identifier
      - `captain_name` (text)
      - `angler1_name` (text)
      - `angler2_name` (text)
      - `created_at` (timestamptz)

    - `catches`
      - `id` (uuid, primary key)
      - `tournament_id` (uuid, FK → tournaments)
      - `boat_id` (uuid, FK → boats)
      - `angler_name` (text)
      - `weight` (numeric) — fish weight in lbs
      - `photo_url` (text) — optional photo URL
      - `culled` (boolean) — whether this fish was culled out
      - `created_at` (timestamptz)

    - `tournament_state`
      - `id` (uuid, primary key)
      - `tournament_id` (uuid, unique FK → tournaments)
      - `status` (text) — 'pending' | 'live' | 'ended'
      - `updated_at` (timestamptz)

  2. Security
    - RLS enabled on all new tables
    - Public read access (anon + authenticated)
    - Authenticated write access
*/

CREATE TABLE IF NOT EXISTS boats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  captain_name text NOT NULL DEFAULT '',
  angler1_name text NOT NULL DEFAULT '',
  angler2_name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE boats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view boats"
  ON boats FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert boats"
  ON boats FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update boats"
  ON boats FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete boats"
  ON boats FOR DELETE
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS catches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  boat_id uuid REFERENCES boats(id) ON DELETE CASCADE,
  angler_name text NOT NULL DEFAULT '',
  weight numeric(5,2) NOT NULL DEFAULT 0,
  photo_url text NOT NULL DEFAULT '',
  culled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE catches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view catches"
  ON catches FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert catches"
  ON catches FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update catches"
  ON catches FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete catches"
  ON catches FOR DELETE
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS tournament_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid UNIQUE REFERENCES tournaments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tournament_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tournament state"
  ON tournament_state FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tournament state"
  ON tournament_state FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tournament state"
  ON tournament_state FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tournament state"
  ON tournament_state FOR DELETE
  TO authenticated
  USING (true);
