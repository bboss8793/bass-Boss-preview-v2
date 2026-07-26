/*
# Create angler_leads table

Captures lead info from anglers who want to join an existing club/team
but whose director/coach may not have set up the org in Bass Boss yet.
Kept completely separate from access_requests (which is the
director/coach approval pipeline and is fully tested in production).

1. New Tables
- `angler_leads`
  - `id` (uuid, primary key, default gen_random_uuid())
  - `angler_name` (text, not null) — the angler's full name
  - `angler_email` (text, not null) — the angler's contact email
  - `angler_phone` (text, nullable) — optional phone number
  - `club_or_team_name` (text, not null) — free text, the org they want to join
  - `director_name` (text, not null) — the director/coach the angler listed
  - `director_contact` (text, not null) — email or phone for the director/coach
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `angler_leads`.
- Anon INSERT only (mirrors access_requests' public-insert pattern):
  the public form must be able to submit a lead without signing in.
- No SELECT / UPDATE / DELETE for anon — leads are read only by
  authenticated admins (Scott) via the service role / dashboard.
- Grant INSERT to anon + authenticated on the table; service role
  bypasses RLS for admin reads.

3. Notes
- Idempotent: uses IF NOT EXISTS and DROP POLICY IF EXISTS.
- No changes to access_requests, its triggers, or its edge functions.
*/

CREATE TABLE IF NOT EXISTS angler_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  angler_name text NOT NULL,
  angler_email text NOT NULL,
  angler_phone text,
  club_or_team_name text NOT NULL,
  director_name text NOT NULL,
  director_contact text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE angler_leads ENABLE ROW LEVEL SECURITY;

-- Anon can insert leads (public form). No anon read/update/delete.
DROP POLICY IF EXISTS "anon_insert_angler_leads" ON angler_leads;
CREATE POLICY "anon_insert_angler_leads" ON angler_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Grant table privileges. anon gets INSERT only; authenticated (admin)
-- gets SELECT for dashboard views. Service role bypasses RLS entirely.
GRANT INSERT ON angler_leads TO anon, authenticated;
GRANT SELECT ON angler_leads TO authenticated;
