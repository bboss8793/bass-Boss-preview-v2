/*
# Create access_requests table

1. Purpose
- Stores "Request Beta Access" form submissions from the public SalesPage.
- This is a no-auth sales page: visitors are not signed in, so the form
  is submitted via the anon-key Supabase client.

2. New Tables
- `access_requests`
  - `id` (uuid, primary key, default gen_random_uuid())
  - `name` (text, not null) — submitter's full name
  - `email` (text, not null) — submitter's email
  - `phone` (text, nullable) — optional phone number
  - `org_type` (text, not null) — "High School Team" or "Adult Bass Club"
  - `org_name` (text, not null) — organization name
  - `member_count` (text, not null) — approximate team size range
  - `location` (text, not null) — city, state
  - `referral` (text, nullable) — how they heard about Bass Boss
  - `tournament_info` (text, nullable) — tournament schedule/needs description
  - `status` (text, default 'pending') — review workflow status
  - `created_at` (timestamptz, default now())

3. Security
- Enable RLS on `access_requests`.
- Allow anon + authenticated INSERT so the public sales-page form can submit.
- Allow authenticated SELECT/UPDATE/DELETE so admins can review and manage requests.
- No anon SELECT: public visitors must not be able to read other people's submissions.

4. Notes
- The form in src/apps/SalesPage.jsx already inserts these exact 9 fields.
- `status` column supports a future admin review workflow (pending/approved/rejected).
*/

CREATE TABLE IF NOT EXISTS access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  org_type text NOT NULL,
  org_name text NOT NULL,
  member_count text NOT NULL,
  location text NOT NULL,
  referral text,
  tournament_info text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon + authenticated) to submit a request
DROP POLICY IF EXISTS "anon_insert_access_requests" ON access_requests;
CREATE POLICY "anon_insert_access_requests"
ON access_requests FOR INSERT
TO anon, authenticated WITH CHECK (true);

-- Allow authenticated admins to read requests
DROP POLICY IF EXISTS "auth_select_access_requests" ON access_requests;
CREATE POLICY "auth_select_access_requests"
ON access_requests FOR SELECT
TO authenticated USING (true);

-- Allow authenticated admins to update requests (e.g. status changes)
DROP POLICY IF EXISTS "auth_update_access_requests" ON access_requests;
CREATE POLICY "auth_update_access_requests"
ON access_requests FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

-- Allow authenticated admins to delete requests
DROP POLICY IF EXISTS "auth_delete_access_requests" ON access_requests;
CREATE POLICY "auth_delete_access_requests"
ON access_requests FOR DELETE
TO authenticated USING (true);
