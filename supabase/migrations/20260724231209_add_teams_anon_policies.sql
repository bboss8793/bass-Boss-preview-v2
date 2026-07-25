/*
# Add anon RLS policies to teams for edge function access

## Purpose
The approve-request edge function needs to:
1. SELECT teams.org_code (collision check when generating a new org code)
2. INSERT into teams (create the new org on approval)

RLS is enabled on teams but has NO policies, so all access is blocked.
We add anon+authenticated SELECT and INSERT policies so the edge function
(using the anon key) can operate.

## Security Notes
1. These policies are intentionally permissive because the teams table in
   this app is a public-facing concept (orgs/clubs that members join via
   org_code). The org_code itself is the access control for members.
2. We do NOT add UPDATE or DELETE policies — the edge function only needs
   SELECT (collision check) and INSERT (create org).
3. Existing team rows (if any) will become readable to anon, which is the
   intended behavior for a public org directory.
*/

-- SELECT: allow anon+authenticated to read teams (org directory + collision check)
DROP POLICY IF EXISTS "anon_select_teams" ON teams;
CREATE POLICY "anon_select_teams" ON teams FOR SELECT
  TO anon, authenticated USING (true);

-- INSERT: allow anon+authenticated to insert (edge function creates org on approval)
DROP POLICY IF EXISTS "anon_insert_teams" ON teams;
CREATE POLICY "anon_insert_teams" ON teams FOR INSERT
  TO anon, authenticated WITH CHECK (true);
