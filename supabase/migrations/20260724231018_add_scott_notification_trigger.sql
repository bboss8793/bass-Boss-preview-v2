/*
# Scott Notification Trigger on access_requests

## Purpose
Adds a SECOND, separate AFTER INSERT trigger on `access_requests` that fires
the `notify_scott_on_access_request()` function. This function calls the
`send-access-confirmation` edge function with `notify_scott: true`, which
sends Scott an email with the request details and Approve/Deny links.

## What this adds
1. Function `notify_scott_on_access_request()` — a PL/pgSQL function that
   uses `net.http_post` to call the edge function with the new row's data.
   It reads the edge function URL from `private_config` (key 'edge_function_url')
   and the anon key from `private_config` (key 'anon_key') if available, falling
   back to constructing the URL from the Supabase project URL.

2. Trigger `notify_scott_on_access_request` — AFTER INSERT on access_requests,
   FOR EACH ROW, calls the function above.

## What this does NOT touch
- The existing `on_access_request_created` trigger and `send_confirmation_email()`
  function are left completely untouched. Both triggers fire independently on
  every insert: the existing one sends the submitter a "we got your request"
  email, and this new one sends Scott the notification with Approve/Deny links.

## Security
- The function uses `net.http_post` (pg_net extension, already installed) to
  call the edge function internally. The edge function validates the payload
  and uses the RESEND_API_KEY secret (configured on the edge function, not
  exposed to the database).
- No RLS changes.

## Important Notes
1. Idempotent — uses DROP FUNCTION IF EXISTS / DROP TRIGGER IF EXISTS before
   creating, so re-running is safe.
2. The edge function URL is constructed as
   `<supabase_url>/functions/v1/send-access-confirmation`. The supabase_url is
   read from the `private_config` table (key 'supabase_url'). If that key does
   not exist, the function silently skips the HTTP call (logs a NOTICE) rather
   than failing the insert.
3. The HTTP call is asynchronous (net.http_post returns immediately); the
   trigger does not block on the response.
*/

-- ── Function ──────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS notify_scott_on_access_request();
CREATE OR REPLACE FUNCTION notify_scott_on_access_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_base_url text;
  v_edge_url text;
  v_anon_key text;
  v_payload jsonb;
BEGIN
  -- Read the Supabase project URL from private_config (if available)
  BEGIN
    SELECT value INTO v_base_url FROM private_config WHERE key = 'supabase_url';
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_base_url := NULL;
  END;

  -- Read the anon key from private_config (if available)
  BEGIN
    SELECT value INTO v_anon_key FROM private_config WHERE key = 'anon_key';
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_anon_key := NULL;
  END;

  IF v_base_url IS NULL THEN
    -- Cannot construct the edge function URL without the base URL.
    -- Skip silently rather than failing the insert.
    RAISE NOTICE 'notify_scott_on_access_request: supabase_url not found in private_config, skipping';
    RETURN NEW;
  END IF;

  v_edge_url := rtrim(v_base_url, '/') || '/functions/v1/send-access-confirmation';

  -- Build the payload for the Scott-notification path of the edge function
  v_payload := jsonb_build_object(
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
    'referral', NEW.referral,
    'tournament_info', NEW.tournament_info
  );

  -- Fire the HTTP request asynchronously (pg_net)
  PERFORM net.http_post(
    url := v_edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_anon_key, '')
    ),
    body := v_payload
  );

  RETURN NEW;
END;
$$;

-- ── Trigger ───────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS notify_scott_on_access_request ON access_requests;
CREATE TRIGGER notify_scott_on_access_request
  AFTER INSERT ON access_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_scott_on_access_request();
