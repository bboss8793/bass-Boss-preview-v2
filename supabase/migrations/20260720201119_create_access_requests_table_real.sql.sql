/*
# Create access_requests table (real, with approval + invite-code columns)

## Purpose
Stores public beta access submissions from the SalesPage "Request Access"
form. Admin reviews each row, then sets approved=true and pastes an
invite_code. This (re)creates the table with the canonical column names the
frontend and email trigger expect.

## Why this migration exists
An earlier migration recorded a table named access_requests, but the table is
NOT present in the production database (confirmed missing: `select * from
access_requests` returns SQLSTATE 42P01 in the Supabase SQL Editor). This
migration creates it for real, idempotently, with the exact columns below.

## New Table: access_requests
- id            uuid, primary key, default gen_random_uuid()
- name          text, not null  — submitter's full name
- email         text, not null  — contact email
- phone         text, nullable  — phone number
- org_type      text, not null  — "High School Team" | "Adult Bass Club"
- org_name      text, not null  — school or club name
- member_count  text, not null  — "1–10" | "11–20" | "21–35" | "36+"
- location      text, not null  — city and state
- referral      text, nullable  — how they heard about Bass Boss
- tournament_info text, nullable — free-form tournament description
- approved      boolean, not null, default false — admin approval flag
- invite_code   text, nullable  — invite code issued on approval
- created_at    timestamptz, not null, default now()

## Security (RLS)
- RLS enabled.
- anon + authenticated INSERT (public form, no login). No anon SELECT.
- authenticated SELECT + UPDATE so admins can review and approve.

## Trigger
- Enables pg_net (outbound HTTP from Postgres).
- notify_access_request_insert(): SECURITY DEFINER, AFTER INSERT, posts the
  new row's email/name/org_name to the send-access-confirmation edge
  function, which emails the submitter via Resend. Async/non-blocking — the
  insert always succeeds even if the HTTP call fails.

## Notes
1. Idempotent: CREATE TABLE IF NOT EXISTS, additive DO-block column guard,
   DROP POLICY IF EXISTS, CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS.
2. No columns dropped or renamed — safe to re-run, no data loss.
3. Edge function must be deployed + RESEND_API_KEY secret set for emails to
   send; otherwise the trigger fires but no email is sent (row still saved).
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
  approved boolean NOT NULL DEFAULT false,
  invite_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Defensive: if a prior version of the table exists without these columns,
-- add them. No-op on a fresh table (columns already present from CREATE).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='access_requests' AND column_name='name') THEN
    ALTER TABLE access_requests ADD COLUMN name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='access_requests' AND column_name='member_count') THEN
    ALTER TABLE access_requests ADD COLUMN member_count text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='access_requests' AND column_name='referral') THEN
    ALTER TABLE access_requests ADD COLUMN referral text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='access_requests' AND column_name='approved') THEN
    ALTER TABLE access_requests ADD COLUMN approved boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='access_requests' AND column_name='invite_code') THEN
    ALTER TABLE access_requests ADD COLUMN invite_code text;
  END IF;
END $$;

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_access_requests" ON access_requests;
CREATE POLICY "anon_insert_access_requests" ON access_requests FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_access_requests" ON access_requests;
CREATE POLICY "auth_select_access_requests" ON access_requests FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_update_access_requests" ON access_requests;
CREATE POLICY "auth_update_access_requests" ON access_requests FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_access_request_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://urxjusdqwbcyjlawnnot.supabase.co/functions/v1/send-access-confirmation',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'email', NEW.email,
      'name', NEW.name,
      'org_name', NEW.org_name
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS access_request_confirmation_trigger ON access_requests;
CREATE TRIGGER access_request_confirmation_trigger
  AFTER INSERT ON access_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_access_request_insert();
