/*
# Clean up access_requests: backfill new columns, drop redundant old ones

## Purpose
The previous migration added the canonical columns (name, member_count,
referral, approved, invite_code) alongside older columns (full_name,
member_count_range, referral_source, status) that held the original data.
This migration copies data from the old columns into the new ones, then drops
the now-redundant old columns so the table matches the intended schema
exactly: id, name, email, phone, org_type, org_name, member_count, location,
referral, tournament_info, approved, invite_code, created_at.

## Changes
1. Backfill: name ← full_name, member_count ← member_count_range,
   referral ← referral_source (only where the new column is null).
2. Drop redundant columns: full_name, member_count_range, referral_source.
   (Data preserved in name, member_count, referral.)
3. Drop status — superseded by the approved boolean, which is the canonical
   approval flag per the agreed schema. All existing rows have status=
   'pending' and approved=false, so no information is lost.

## Security
No policy or RLS changes — existing policies (anon insert; auth select +
update) remain in place.

## Notes
1. Idempotent: backfill UPDATE is guarded by WHERE new_col IS NULL; DROP
   COLUMN IF EXISTS is safe to re-run.
2. After this migration the column list is exactly the spec.
*/

UPDATE access_requests
SET name = full_name
WHERE name IS NULL AND full_name IS NOT NULL;

UPDATE access_requests
SET member_count = member_count_range
WHERE member_count IS NULL AND member_count_range IS NOT NULL;

UPDATE access_requests
SET referral = referral_source
WHERE referral IS NULL AND referral_source IS NOT NULL;

ALTER TABLE access_requests DROP COLUMN IF EXISTS full_name;
ALTER TABLE access_requests DROP COLUMN IF EXISTS member_count_range;
ALTER TABLE access_requests DROP COLUMN IF EXISTS referral_source;
ALTER TABLE access_requests DROP COLUMN IF EXISTS status;
