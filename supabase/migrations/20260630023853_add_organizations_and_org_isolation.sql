/*
# Organizations & Multi-Org Isolation

## Overview
Introduces director/coach account system and per-organization data isolation.
Every club and team gets their own organization row with a unique join code.
All tournament, boat, catch, and roster data is tagged with org_id.

## New Tables

### organizations
Owns each club or team. Created at director registration.
- id (uuid, pk)
- name — display name (e.g. "Lake Conroe Bass Club")
- type — "club" | "team"
- code — 6-char uppercase alphanumeric join code (unique)
- director_id — FK to auth.users, the registering director/coach
- roster_mode — "open" (members self-add name) | "locked" (pre-loaded list)
- created_at

### roster_members
Pre-loaded angler/member names for locked-roster orgs.
- id (uuid, pk)
- org_id — FK to organizations
- name — angler display name
- created_at

## Modified Tables (added org_id column)
- tournaments — org_id uuid nullable FK to organizations
- boats — org_id uuid nullable FK to organizations
- catches — org_id uuid nullable FK to organizations
- teams — org_id uuid nullable FK to organizations
- team_members — org_id uuid nullable FK to organizations
- tournament_state — org_id uuid nullable FK to organizations (replaces hardcoded ID isolation)
- emergencies — org_id uuid nullable FK to organizations

## Security Notes
1. organizations: director can manage their own row. Anon can SELECT (needed for code lookup at join).
2. roster_members: director manages; anon can SELECT (needed to show roster at join).
3. All other tables: director-authenticated writes check org ownership; anon INSERT allowed for catch logging (captains are unauthenticated). SELECT open to anon (frontend always filters by org_id from session).
4. Existing rows retain null org_id and remain accessible as before during transition.
*/

-- ── organizations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('club','team')),
  code text NOT NULL UNIQUE,
  director_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roster_mode text NOT NULL DEFAULT 'open' CHECK (roster_mode IN ('open','locked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_organizations" ON organizations;
CREATE POLICY "anon_select_organizations" ON organizations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "director_insert_organizations" ON organizations;
CREATE POLICY "director_insert_organizations" ON organizations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = director_id);

DROP POLICY IF EXISTS "director_update_organizations" ON organizations;
CREATE POLICY "director_update_organizations" ON organizations FOR UPDATE
  TO authenticated USING (auth.uid() = director_id) WITH CHECK (auth.uid() = director_id);

DROP POLICY IF EXISTS "director_delete_organizations" ON organizations;
CREATE POLICY "director_delete_organizations" ON organizations FOR DELETE
  TO authenticated USING (auth.uid() = director_id);

-- ── roster_members ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roster_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE roster_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_roster_members" ON roster_members;
CREATE POLICY "anon_select_roster_members" ON roster_members FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "director_insert_roster_members" ON roster_members;
CREATE POLICY "director_insert_roster_members" ON roster_members FOR INSERT
  TO authenticated WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid())
  );

DROP POLICY IF EXISTS "director_update_roster_members" ON roster_members;
CREATE POLICY "director_update_roster_members" ON roster_members FOR UPDATE
  TO authenticated
  USING (org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid()));

DROP POLICY IF EXISTS "director_delete_roster_members" ON roster_members;
CREATE POLICY "director_delete_roster_members" ON roster_members FOR DELETE
  TO authenticated USING (
    org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid())
  );

-- ── Add org_id to existing tables ─────────────────────────────────────────────
ALTER TABLE tournaments    ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE boats          ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE catches        ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE teams          ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE team_members   ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE tournament_state ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE emergencies    ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tournaments_org_id    ON tournaments(org_id);
CREATE INDEX IF NOT EXISTS idx_boats_org_id          ON boats(org_id);
CREATE INDEX IF NOT EXISTS idx_catches_org_id        ON catches(org_id);
CREATE INDEX IF NOT EXISTS idx_tournament_state_org  ON tournament_state(org_id);
CREATE INDEX IF NOT EXISTS idx_emergencies_org_id    ON emergencies(org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_code    ON organizations(code);

-- ── Update RLS on tournaments (replace old open policies) ─────────────────────
DROP POLICY IF EXISTS "Anyone can view tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can insert tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can update tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can delete tournaments" ON tournaments;

DROP POLICY IF EXISTS "anon_select_tournaments" ON tournaments;
CREATE POLICY "anon_select_tournaments" ON tournaments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "director_insert_tournaments" ON tournaments;
CREATE POLICY "director_insert_tournaments" ON tournaments FOR INSERT
  TO authenticated WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid())
  );

DROP POLICY IF EXISTS "director_update_tournaments" ON tournaments;
CREATE POLICY "director_update_tournaments" ON tournaments FOR UPDATE
  TO authenticated
  USING (org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid()));

DROP POLICY IF EXISTS "director_delete_tournaments" ON tournaments;
CREATE POLICY "director_delete_tournaments" ON tournaments FOR DELETE
  TO authenticated USING (
    org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid())
  );

-- ── Update RLS on boats ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view boats" ON boats;
DROP POLICY IF EXISTS "Authenticated users can insert boats" ON boats;
DROP POLICY IF EXISTS "Authenticated users can update boats" ON boats;
DROP POLICY IF EXISTS "Authenticated users can delete boats" ON boats;
DROP POLICY IF EXISTS "anon_insert_boats" ON boats;
DROP POLICY IF EXISTS "anon_update_boats" ON boats;

DROP POLICY IF EXISTS "anon_select_boats" ON boats;
CREATE POLICY "anon_select_boats" ON boats FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "director_insert_boats" ON boats;
CREATE POLICY "director_insert_boats" ON boats FOR INSERT
  TO authenticated WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid())
  );

DROP POLICY IF EXISTS "director_update_boats" ON boats;
CREATE POLICY "director_update_boats" ON boats FOR UPDATE
  TO authenticated
  USING (org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid()));

DROP POLICY IF EXISTS "director_delete_boats" ON boats;
CREATE POLICY "director_delete_boats" ON boats FOR DELETE
  TO authenticated USING (
    org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid())
  );

-- ── Update RLS on catches (captains log catches as anon) ──────────────────────
DROP POLICY IF EXISTS "Anyone can view catches" ON catches;
DROP POLICY IF EXISTS "Authenticated users can insert catches" ON catches;
DROP POLICY IF EXISTS "Authenticated users can update catches" ON catches;
DROP POLICY IF EXISTS "Authenticated users can delete catches" ON catches;
DROP POLICY IF EXISTS "anon_insert_catches" ON catches;
DROP POLICY IF EXISTS "anon_update_catches" ON catches;

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

-- ── Update RLS on tournament_state ────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view tournament state" ON tournament_state;
DROP POLICY IF EXISTS "Authenticated users can insert tournament state" ON tournament_state;
DROP POLICY IF EXISTS "Authenticated users can update tournament state" ON tournament_state;
DROP POLICY IF EXISTS "Authenticated users can delete tournament state" ON tournament_state;

DROP POLICY IF EXISTS "anon_select_tournament_state" ON tournament_state;
CREATE POLICY "anon_select_tournament_state" ON tournament_state FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "director_insert_tournament_state" ON tournament_state;
CREATE POLICY "director_insert_tournament_state" ON tournament_state FOR INSERT
  TO authenticated WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid())
  );

DROP POLICY IF EXISTS "director_update_tournament_state" ON tournament_state;
CREATE POLICY "director_update_tournament_state" ON tournament_state FOR UPDATE
  TO authenticated
  USING (org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid()));

DROP POLICY IF EXISTS "director_delete_tournament_state" ON tournament_state;
CREATE POLICY "director_delete_tournament_state" ON tournament_state FOR DELETE
  TO authenticated USING (
    org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid())
  );

-- ── Update RLS on teams ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can insert teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can update teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can delete teams" ON teams;

DROP POLICY IF EXISTS "anon_select_teams" ON teams;
CREATE POLICY "anon_select_teams" ON teams FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "director_insert_teams" ON teams;
CREATE POLICY "director_insert_teams" ON teams FOR INSERT
  TO authenticated WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid())
  );

DROP POLICY IF EXISTS "director_update_teams" ON teams;
CREATE POLICY "director_update_teams" ON teams FOR UPDATE
  TO authenticated
  USING (org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid()));

DROP POLICY IF EXISTS "director_delete_teams" ON teams;
CREATE POLICY "director_delete_teams" ON teams FOR DELETE
  TO authenticated USING (
    org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid())
  );

-- ── Update RLS on team_members ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view team members" ON team_members;
DROP POLICY IF EXISTS "Authenticated users can insert team members" ON team_members;
DROP POLICY IF EXISTS "Authenticated users can delete team members" ON team_members;

DROP POLICY IF EXISTS "anon_select_team_members" ON team_members;
CREATE POLICY "anon_select_team_members" ON team_members FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "director_insert_team_members" ON team_members;
CREATE POLICY "director_insert_team_members" ON team_members FOR INSERT
  TO authenticated WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid())
  );

DROP POLICY IF EXISTS "director_delete_team_members" ON team_members;
CREATE POLICY "director_delete_team_members" ON team_members FOR DELETE
  TO authenticated USING (
    org_id IN (SELECT id FROM organizations WHERE director_id = auth.uid())
  );
