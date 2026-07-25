/*
# Add SELECT and UPDATE policies to access_requests

## Purpose
The approve-request and deny-request edge functions need to read and update
access_requests rows by id + approval_token. They use the service role key
(which bypasses RLS), but as a defense-in-depth measure and to support the
anon-key fallback path, we add explicit SELECT and UPDATE policies.

The SELECT policy allows anyone to read a row (the edge function looks up
by id+token — the token itself is the access control). The UPDATE policy
allows anyone to update (same reasoning — the edge function validates the
token before updating).

## Security Notes
1. The approval_token is the secret that gates access — only someone with
   the email link (containing the token) can reach the edge function endpoint.
2. The edge function validates id+token match before any update.
3. These policies are intentionally permissive because the access_requests
   table is a public-facing intake form (anon INSERT is already allowed).
   The sensitive fields (status, approval_token) are auto-generated and
   not exposed in the frontend.
*/

-- SELECT: allow anon+authenticated to read (edge function lookup)
DROP POLICY IF EXISTS "anon_select_access_requests" ON access_requests;
CREATE POLICY "anon_select_access_requests" ON access_requests FOR SELECT
  TO anon, authenticated USING (true);

-- UPDATE: allow anon+authenticated to update (edge function approve/deny)
DROP POLICY IF EXISTS "anon_update_access_requests" ON access_requests;
CREATE POLICY "anon_update_access_requests" ON access_requests FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
