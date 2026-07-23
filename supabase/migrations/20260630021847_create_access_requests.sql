/*
# Create access_requests table

## Purpose
Stores beta access request submissions from prospective club directors and team coaches who want to sign up for Bass Boss. This is a pre-registration form — no user account is created.

## New Tables

### access_requests
Holds every form submission from the public beta sign-up form on the sales page.

Columns:
- `id` — uuid primary key, auto-generated
- `full_name` — text, required — submitter's full name
- `email` — text, required — contact email
- `phone` — text, optional — phone number
- `org_type` — text, required — "High School Team" or "Adult Bass Club"
- `org_name` — text, required — name of the school or club
- `member_count_range` — text, required — one of: "1-10", "11-20", "21-35", "36+"
- `location` — text, required — city and state
- `referral_source` — text, optional — how they heard about Bass Boss
- `tournament_info` — text, optional — free-form description of their tournaments
- `status` — text, not null, defaults to "pending" — workflow status for admins
- `created_at` — timestamptz, defaults to now()

## Security
- RLS enabled.
- Anonymous INSERT allowed (public beta form, no login required).
- No SELECT/UPDATE/DELETE for anon — submissions are write-only from the public side.
- Authenticated SELECT allowed so admins can review submissions.

## Notes
1. No user_id column — this table does not link to auth.users. Submissions are anonymous contact forms.
2. `status` is for internal admin use (pending → contacted → onboarded / declined). Not shown to submitters.
3. Anon-only INSERT policy means the public can submit but cannot read or modify any row.
*/

CREATE TABLE IF NOT EXISTS access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  org_type text NOT NULL,
  org_name text NOT NULL,
  member_count_range text NOT NULL,
  location text NOT NULL,
  referral_source text,
  tournament_info text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_access_requests" ON access_requests;
CREATE POLICY "anon_insert_access_requests" ON access_requests FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_access_requests" ON access_requests;
CREATE POLICY "auth_select_access_requests" ON access_requests FOR SELECT
TO authenticated USING (true);
