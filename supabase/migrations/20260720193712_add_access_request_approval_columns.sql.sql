/*
# Add approval + invite-code columns to access_requests

## Purpose
The access_requests table was created earlier with the public form's columns
(full_name, email, phone, org_type, org_name, member_count_range, location,
referral_source, tournament_info, status, created_at) but was missing the two
columns needed for the approval / invite-code workflow that an admin runs
after reviewing a submission. This migration adds them.

## Changes
1. Adds `approved` — boolean, NOT NULL, defaults to false. Set to true by an
   admin when they approve the request.
2. Adds `invite_code` — text, nullable. Populated by the admin with the
   generated invite code when the request is approved, so the director can be
   sent a join link.
3. Adds an authenticated UPDATE policy so admins can flip `approved`, set
   `invite_code`, and change `status` on a submission. Anon retains
   insert-only access (already in place).

## Security
- RLS already enabled on access_requests.
- Existing anon INSERT policy (write-only public form) — unchanged.
- Existing authenticated SELECT policy (admins can review) — unchanged.
- NEW authenticated UPDATE policy — admins can update any row (the table is
  admin-managed, not user-owned; this is the intended access pattern for an
  internal review queue).

## Notes
1. This migration is additive only — no columns dropped or renamed, no data
   lost. Existing rows get approved=false and invite_code=null.
2. Idempotent: uses DO $$ ... IF NOT EXISTS ... END $$ for the column adds so
   re-running is safe.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'access_requests' AND column_name = 'approved'
  ) THEN
    ALTER TABLE access_requests ADD COLUMN approved boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'access_requests' AND column_name = 'invite_code'
  ) THEN
    ALTER TABLE access_requests ADD COLUMN invite_code text;
  END IF;
END $$;

-- Allow authenticated admins to update submissions (approve, set invite code, change status)
DROP POLICY IF EXISTS "auth_update_access_requests" ON access_requests;
CREATE POLICY "auth_update_access_requests" ON access_requests FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);
