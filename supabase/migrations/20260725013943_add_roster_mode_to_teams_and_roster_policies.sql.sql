/*
# Add roster_mode to teams and RLS policies for roster table

## Purpose
The frontend's join flow and registration dashboard reference a `roster_mode` column
on the organization/team table (open vs locked roster). This column was defined in
the organizations migration but the `organizations` table was never created — the app
actually uses the `teams` table. This migration adds `roster_mode` to `teams` so the
existing frontend code works against the real table.

It also adds RLS policies to the `roster` table so that:
- Anyone (anon + authenticated) can SELECT roster rows (needed for the join flow to
  display a locked roster so a member can pick their name).
- Authenticated directors can INSERT/UPDATE/DELETE roster rows for their own team
  (matched via director_email on the teams table).

## Changes
1. teams: add `roster_mode text NOT NULL DEFAULT 'open'` with CHECK constraint
   restricting values to 'open' or 'locked'.
2. roster: enable RLS (was enabled already per list_tables, but ensure) and add
   4 CRUD policies:
   - anon_select_roster: SELECT for anon + authenticated (USING true) — roster names
     are shown to members at join time, no sign-in required.
   - director_insert_roster: INSERT for authenticated where the team's director_email
     matches the auth user's email.
   - director_update_roster: UPDATE for authenticated with the same ownership check.
   - director_delete_roster: DELETE for authenticated with the same ownership check.

## Security Notes
- SELECT is intentionally open (USING true) because roster names must be readable by
  unauthenticated members at the join screen. This matches the existing pattern on
  teams (anon_select_teams USING true).
- Write policies are scoped to the authenticated director who owns the team, verified
  by matching roster.team_id -> teams.id -> teams.director_email = auth.jwt() email.
*/

-- 1. Add roster_mode to teams
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'roster_mode'
  ) THEN
    ALTER TABLE teams ADD COLUMN roster_mode text NOT NULL DEFAULT 'open'
      CHECK (roster_mode IN ('open', 'locked'));
  END IF;
END $$;

-- 2. Roster RLS policies
ALTER TABLE roster ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_roster" ON roster;
CREATE POLICY "anon_select_roster" ON roster FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "director_insert_roster" ON roster;
CREATE POLICY "director_insert_roster" ON roster FOR INSERT
  TO authenticated WITH CHECK (
    team_id IN (
      SELECT teams.id FROM teams
      WHERE teams.director_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "director_update_roster" ON roster;
CREATE POLICY "director_update_roster" ON roster FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT teams.id FROM teams
      WHERE teams.director_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT teams.id FROM teams
      WHERE teams.director_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "director_delete_roster" ON roster;
CREATE POLICY "director_delete_roster" ON roster FOR DELETE
  TO authenticated USING (
    team_id IN (
      SELECT teams.id FROM teams
      WHERE teams.director_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );
