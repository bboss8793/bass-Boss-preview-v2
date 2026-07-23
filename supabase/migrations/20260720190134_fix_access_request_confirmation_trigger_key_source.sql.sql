/*
# Fix access_request confirmation trigger — hardcoded URL + correct key source

## Purpose
Corrects the trigger function from the previous migration so it uses the
project's known edge function URL directly (it is project-scoped and not a
secret) instead of a config setting that may not exist, and reads the service
role key via the standard Supabase approach.

## Changes
- Replaces `notify_access_request_insert()` with a version that uses the fixed
  edge function URL `https://urxjusdqwbcyjlawnnot.supabase.co/functions/v1/send-access-confirmation`.
- Reads the service role key from `current_setting('app.settings.service_role_key', true)`,
  which Supabase exposes to SECURITY DEFINER functions.
- Trigger itself is unchanged (already in place from the prior migration).

## Security
- SECURITY DEFINER, owned by postgres, search_path pinned to public, extensions.
- Only the service role key is passed in the Authorization header; it is read
  at runtime, never stored in the function body.
*/

CREATE OR REPLACE FUNCTION public.notify_access_request_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  edge_url text := 'https://urxjusdqwbcyjlawnnot.supabase.co/functions/v1/send-access-confirmation';
  service_role_key text;
BEGIN
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
