/*
# Send confirmation email on new access_requests insert

## Purpose
When a prospective director or coach submits the beta access form on the sales
page (a new row in `access_requests`), automatically trigger the
`send-access-confirmation` edge function, which sends a branded "We've got your
Bass Boss request" email to the submitter via Resend.

## How it works
1. Enables the `pg_net` extension (async HTTP client for Postgres).
2. Creates a trigger function `notify_access_request_insert()` that builds a
   JSON payload of the new row's email, full_name, and org_name, then posts it
   to the edge function URL using `net.http_post`. The request runs with the
   service role key so it passes the function's auth (the endpoint is set to
   `verify_jwt = false`, but the key is still sent so Supabase accepts the
   invocation). `Authorization` and `Content-Type` headers are set.
3. Attaches the function as an AFTER INSERT trigger on `access_requests`.

## Security
- `pg_net` is installed in the `extensions` schema (Supabase default).
- The trigger function is `SECURITY DEFINER` so the `net.http_post` call has
  permission to make outbound requests; the function is owned by `postgres`.
- The service role key is read from `current_setting('app.service_role_key')`
  at call time — it is never hard-coded in the function body.
- Only INSERTs on `access_requests` fire the trigger; no other tables are
  affected.

## Important notes
1. The edge function requires a secret named `RESEND_API_KEY` to be configured
   in the project's Edge Function secrets. Without it the function returns a
   500 and no email is sent (the insert itself still succeeds — the trigger
   fires the HTTP call asynchronously and does not block the insert).
2. `net.http_post` is async and non-blocking — the insert transaction is not
   held open by the HTTP request. If the edge function fails, the access
   request row is still saved.
3. This migration is idempotent: the extension, function, and trigger use
   IF NOT EXISTS / OR REPLACE so re-running is safe.
*/

-- 1. Enable pg_net for outbound HTTP from the database
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- 2. Trigger function: POST the new row to the confirmation edge function
CREATE OR REPLACE FUNCTION public.notify_access_request_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  edge_url text;
  service_role_key text;
BEGIN
  edge_url := current_setting('app.settings.edge_function_url', true)
    || '/send-access-confirmation';

  service_role_key := current_setting('app.settings.service_role_key', true);

  PERFORM net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_role_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'email', NEW.email,
      'full_name', NEW.full_name,
      'org_name', NEW.org_name
    )
  );

  RETURN NEW;
END;
$$;

-- 3. Attach the trigger
DROP TRIGGER IF EXISTS access_request_confirmation_trigger ON access_requests;
CREATE TRIGGER access_request_confirmation_trigger
  AFTER INSERT ON access_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_access_request_insert();
