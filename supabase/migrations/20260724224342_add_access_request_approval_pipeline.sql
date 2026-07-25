/*
# Access request approval pipeline — status tracking, tenancy fields, Scott notification

## Purpose
Fixes the director request-to-approval pipeline end to end:
1. Adds approval_token + reviewed_at to access_requests for one-click email
   approval/denial without login.
2. Adds real tenancy fields to teams (org_code, director contact, org_type, status)
   so an approved director becomes a real org/tenant record.
3. Installs pg_net and creates an AFTER INSERT trigger that emails Scott
   (scottscajun@gmail.com) a notification with Approve/Deny links whenever a
   new access_request is submitted.

## 1. access_requests — new columns
- approval_token  uuid, default gen_random_uuid() — private token authenticating
  one-click email actions. Unique per row.
- reviewed_at     timestamptz, nullable — set when status leaves 'pending'.

The existing `status` column (default 'pending', values pending/approved/denied)
is already present and unchanged.

## 2. teams — new tenancy columns
- org_code        text, unique, not null — 6-char alphanumeric shareable code
                  generated on approval.
- director_name   text
- director_email  text
- director_phone  text
- org_type        text — 'adult_club' | 'high_school'
- status          text, default 'active'

The teams table is currently empty (0 rows), so adding NOT NULL org_code is safe.
A unique index on org_code enforces no duplicate codes across orgs.

## 3. pg_net extension + Scott notification trigger
- Enables pg_net (outbound HTTP from Postgres) in the extensions schema.
- notify_scott_access_request(): SECURITY DEFINER, AFTER INSERT on access_requests.
  Posts a JSON payload to the send-access-confirmation edge function with a flag
  indicating this is a Scott-notification (not the submitter confirmation). The
  edge function handles routing the email to Scott with approve/deny links.
  Async/non-blocking — the insert always succeeds even if HTTP fails.

## Security
- RLS already enabled on access_requests and teams; no policy changes needed.
- The trigger function is SECURITY DEFINER with search_path pinned to
  public, extensions.
- approval_token is generated server-side; anon cannot read it (no anon SELECT).

## Notes
1. Idempotent: additive DO-block column guards, CREATE INDEX IF NOT EXISTS,
   CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS.
2. No columns dropped or renamed — safe to re-run, no data loss.
3. Edge function send-access-confirmation must be deployed with
   RESEND_API_KEY secret set for emails to send.
*/

-- ── Part 1: access_requests columns ──────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='access_requests'
                   AND column_name='approval_token') THEN
    ALTER TABLE access_requests ADD COLUMN approval_token uuid NOT NULL DEFAULT gen_random_uuid();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='access_requests'
                   AND column_name='reviewed_at') THEN
    ALTER TABLE access_requests ADD COLUMN reviewed_at timestamptz;
  END IF;
END $$;

-- ── Part 2: teams tenancy columns ─────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='teams'
                   AND column_name='org_code') THEN
    ALTER TABLE teams ADD COLUMN org_code text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='teams'
                   AND column_name='director_name') THEN
    ALTER TABLE teams ADD COLUMN director_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='teams'
                   AND column_name='director_email') THEN
    ALTER TABLE teams ADD COLUMN director_email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='teams'
                   AND column_name='director_phone') THEN
    ALTER TABLE teams ADD COLUMN director_phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='teams'
                   AND column_name='org_type') THEN
    ALTER TABLE teams ADD COLUMN org_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='teams'
                   AND column_name='status') THEN
    ALTER TABLE teams ADD COLUMN status text NOT NULL DEFAULT 'active';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS teams_org_code_key ON teams (org_code);

-- ── Part 3: pg_net + Scott notification trigger ───────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_scott_access_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  edge_url text := 'https://oknqgsnvxlpuyrfokakq.supabase.co/functions/v1/send-access-confirmation';
BEGIN
  PERFORM net.http_post(
    url := edge_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'notify_scott', true,
      'id', NEW.id,
      'approval_token', NEW.approval_token,
      'name', NEW.name,
      'email', NEW.email,
      'phone', NEW.phone,
      'org_type', NEW.org_type,
      'org_name', NEW.org_name,
      'member_count', NEW.member_count,
      'location', NEW.location,
      'tournament_info', NEW.tournament_info
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS access_request_scott_notify_trigger ON access_requests;
CREATE TRIGGER access_request_scott_notify_trigger
  AFTER INSERT ON access_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_scott_access_request();
