/*
# Access Request Approval Pipeline — Schema Changes

## Purpose
Replaces the unused `approved` (boolean) and `invite_code` (text) columns on
`access_requests` with a proper approval workflow: `status`, `approval_token`,
and `reviewed_at`. This enables one-click Approve/Deny links emailed to Scott,
with replay protection.

## Changes to `access_requests`

### Dropped columns (confirmed no data — all NULL/false across all 3 rows)
- `approved` (boolean, default false) — never used; all rows are false
- `invite_code` (text, nullable) — never used; all rows are NULL

### Added columns
1. `status` (text, NOT NULL, default 'pending')
   - Tracks the request lifecycle: 'pending' → 'approved' | 'denied'
   - Replaces the boolean `approved` flag with a richer state machine
2. `approval_token` (uuid, NOT NULL, default gen_random_uuid())
   - Unique-per-row secret token embedded in Approve/Deny email links
   - Prevents unauthorized approval/denial — only someone with the email link can act
3. `reviewed_at` (timestamptz, nullable)
   - Timestamp of when Scott approved or denied the request
   - NULL means still pending

## Security
- No RLS policy changes — existing policies on `access_requests` are unchanged
- The `approval_token` column is auto-generated on insert, so the frontend
  never needs to supply it
- Existing trigger `on_access_request_created` / function `send_confirmation_email()`
  is left untouched — it continues to send the submitter confirmation email

## Important Notes
1. This migration is idempotent — uses IF EXISTS / IF NOT EXISTS guards
2. The existing `on_access_request_created` trigger is NOT modified or replaced
3. A second trigger (`notify_scott_on_access_request`) is added in a separate
   migration to avoid coupling schema changes with trigger logic
*/

-- 1. Drop the two unused columns (confirmed all NULL/false across all 3 rows)
ALTER TABLE access_requests DROP COLUMN IF EXISTS approved;
ALTER TABLE access_requests DROP COLUMN IF EXISTS invite_code;

-- 2. Add the new approval-workflow columns
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS approval_token uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 3. Backfill the 3 existing rows so they have status='pending' and a token
--    (gen_random_uuid() default fills approval_token automatically on UPDATE
--    if still NULL, but we set explicitly to be safe)
UPDATE access_requests
SET status = COALESCE(status, 'pending'),
    approval_token = COALESCE(approval_token, gen_random_uuid())
WHERE status IS NULL OR approval_token IS NULL;
