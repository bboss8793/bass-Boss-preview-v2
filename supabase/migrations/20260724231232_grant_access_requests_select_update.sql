/*
# Grant SELECT and UPDATE on access_requests to anon, authenticated, service_role

## Purpose
The access_requests table has RLS policies for SELECT and UPDATE (added in
a previous migration), but the underlying table-level GRANTs only cover INSERT
for anon/authenticated. The approve-request and deny-request edge functions
need SELECT (to look up by id+token) and UPDATE (to set status='approved'/'denied'
and reviewed_at).

## Changes
- GRANT SELECT, UPDATE ON access_requests TO anon, authenticated, service_role

## Security
- RLS policies still gate which rows are visible/updatable. The GRANT just
  allows the role to attempt the operation; the policy decides if it succeeds.
- service_role normally bypasses RLS, but we grant explicitly for completeness.
*/

GRANT SELECT, UPDATE ON access_requests TO anon;
GRANT SELECT, UPDATE ON access_requests TO authenticated;
GRANT SELECT, UPDATE ON access_requests TO service_role;

-- Also ensure teams has SELECT and INSERT for anon (edge function needs both)
GRANT SELECT, INSERT ON teams TO anon;
GRANT SELECT, INSERT ON teams TO authenticated;
GRANT SELECT, INSERT ON teams TO service_role;
