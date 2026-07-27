/*
# Add Missing Columns for Tournament System

The production database schema was created differently from what the application
code expects. Most migration files were written but never applied to production.
This migration adds the missing columns to bring the production schema in line
with what ClubDashboard.jsx and TeamDashboard.jsx require.

## Tables modified:

### tournaments — adds 10 missing columns:
- lake_id (text) — lake identifier
- lake_name (text) — lake display name
- final_countdown_seconds (integer, default 60) — final countdown threshold
- format_type (text, default 'team') — tournament format
- scoring_format (text, default 'best5') — scoring format
- big_bass_side_pot (boolean, default false) — big bass side pot flag
- min_length_inches (numeric(4,1)) — minimum fish length
- is_paper_tournament (boolean, default false) — paper tournament flag
- app_type (text, default 'team') — which app created the tournament
- org_id (uuid) — organization isolation

### boats — adds 4 missing columns:
- name (text) — boat name
- angler1_name (text) — first angler name
- angler2_name (text) — second angler name
- team_id (uuid) — team reference
- org_id (uuid) — organization isolation

### catches — adds 4 missing columns:
- org_id (uuid) — organization isolation
- review_status (text, default 'approved') — photo review workflow
- rejection_reason (text) — reason if rejected
- length_inches (numeric(4,1)) — fish length in inches

### teams — adds 1 missing column:
- org_id (uuid) — organization isolation

## New tables: organizations, tournament_state, team_members, emergencies
## Security: RLS enabled on all new tables, anon+authenticated CRUD (no-auth app)
## Data backfill: lake_id/lake_name from `lake`, name from `boat_number`, etc.
*/

-- ─── tournaments: add missing columns ───────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS lake_id text NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS lake_name text NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS final_countdown_seconds integer NOT NULL DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS format_type text NOT NULL DEFAULT 'team';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS scoring_format text NOT NULL DEFAULT 'best5';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS big_bass_side_pot boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS min_length_inches numeric(4,1);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS is_paper_tournament boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS app_type text NOT NULL DEFAULT 'team';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS org_id uuid;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

UPDATE tournaments SET lake_id = lake WHERE lake_id = '' AND lake IS NOT NULL;
UPDATE tournaments SET lake_name = lake WHERE lake_name = '' AND lake IS NOT NULL;

-- ─── boats: add missing columns ─────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE boats ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE boats ADD COLUMN IF NOT EXISTS angler1_name text NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE boats ADD COLUMN IF NOT EXISTS angler2_name text NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE boats ADD COLUMN IF NOT EXISTS team_id uuid;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE boats ADD COLUMN IF NOT EXISTS org_id uuid;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

UPDATE boats SET name = boat_number WHERE name = '' AND boat_number IS NOT NULL;
UPDATE boats SET angler1_name = partner_name WHERE angler1_name = '' AND partner_name IS NOT NULL;

-- ─── catches: add missing columns ───────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE catches ADD COLUMN IF NOT EXISTS org_id uuid;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE catches ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE catches ADD COLUMN IF NOT EXISTS rejection_reason text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE catches ADD COLUMN IF NOT EXISTS length_inches numeric(4,1);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

UPDATE catches SET length_inches = length WHERE length_inches IS NULL AND length IS NOT NULL;

-- ─── teams: add missing column ──────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE teams ADD COLUMN IF NOT EXISTS org_id uuid;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ─── New table: organizations ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  org_type text NOT NULL DEFAULT 'club',
  org_code text UNIQUE,
  tier text NOT NULL DEFAULT 'pro',
  billing_status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_organizations" ON organizations;
CREATE POLICY "anon_select_organizations" ON organizations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_organizations" ON organizations;
CREATE POLICY "anon_insert_organizations" ON organizations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_organizations" ON organizations;
CREATE POLICY "anon_update_organizations" ON organizations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_organizations" ON organizations;
CREATE POLICY "anon_delete_organizations" ON organizations FOR DELETE
  TO anon, authenticated USING (true);

-- ─── New table: tournament_state ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournament_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  updated_at timestamptz DEFAULT now(),
  org_id uuid
);

ALTER TABLE tournament_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_tournament_state" ON tournament_state;
CREATE POLICY "anon_select_tournament_state" ON tournament_state FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_tournament_state" ON tournament_state;
CREATE POLICY "anon_insert_tournament_state" ON tournament_state FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_tournament_state" ON tournament_state;
CREATE POLICY "anon_update_tournament_state" ON tournament_state FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_tournament_state" ON tournament_state;
CREATE POLICY "anon_delete_tournament_state" ON tournament_state FOR DELETE
  TO anon, authenticated USING (true);

-- ─── New table: team_members ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  grade integer,
  role text NOT NULL DEFAULT 'angler',
  active boolean NOT NULL DEFAULT true,
  org_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_team_members" ON team_members;
CREATE POLICY "anon_select_team_members" ON team_members FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_team_members" ON team_members;
CREATE POLICY "anon_insert_team_members" ON team_members FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_team_members" ON team_members;
CREATE POLICY "anon_update_team_members" ON team_members FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_team_members" ON team_members;
CREATE POLICY "anon_delete_team_members" ON team_members FOR DELETE
  TO anon, authenticated USING (true);

-- ─── New table: emergencies ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emergencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  boat_id uuid,
  angler_name text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT '',
  details text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  org_id uuid
);

ALTER TABLE emergencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_emergencies" ON emergencies;
CREATE POLICY "anon_select_emergencies" ON emergencies FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_emergencies" ON emergencies;
CREATE POLICY "anon_insert_emergencies" ON emergencies FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_emergencies" ON emergencies;
CREATE POLICY "anon_update_emergencies" ON emergencies FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_emergencies" ON emergencies;
CREATE POLICY "anon_delete_emergencies" ON emergencies FOR DELETE
  TO anon, authenticated USING (true);

-- ─── Storage bucket: catch-photos ───────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('catch-photos', 'catch-photos', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/heic'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can upload catch photos" ON storage.objects;
CREATE POLICY "Anyone can upload catch photos" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'catch-photos');

DROP POLICY IF EXISTS "Anyone can view catch photos" ON storage.objects;
CREATE POLICY "Anyone can view catch photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'catch-photos');

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tournaments_org_id ON tournaments(org_id);
CREATE INDEX IF NOT EXISTS idx_boats_org_id ON boats(org_id);
CREATE INDEX IF NOT EXISTS idx_catches_org_id ON catches(org_id);
CREATE INDEX IF NOT EXISTS idx_catches_tournament_id ON catches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_state_org_id ON tournament_state(org_id);
CREATE INDEX IF NOT EXISTS idx_team_members_org_id ON team_members(org_id);
