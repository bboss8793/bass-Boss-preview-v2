/*
# Create access_requests table on enebknafoskcsaijxbue (production)

## Purpose
Stores public beta access submissions from the SalesPage "Request Access"
form. Admin reviews each row, then sets approved=true and pastes an
invite_code. This creates the table on the correct production project.

## Columns (exact spec)
id uuid PK default gen_random_uuid(), name, email, phone, org_type, org_name,
member_count, location, referral, tournament_info, approved bool default
false, invite_code, created_at timestamptz default now().

## RLS
anon + authenticated INSERT (public form, no login, no anon SELECT).
authenticated SELECT + UPDATE (admin review + approval).

## Trigger
AFTER INSERT posts {email,name,org_name} to the send-access-confirmation edge
function on this same project via pg_net.
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
    url := 'https://enebknafoskcsaijxbue.supabase.co/functions/v1/send-access-confirmation',
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
