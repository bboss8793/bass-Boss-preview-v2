/*
# Simplify access_request confirmation trigger — drop auth header

## Purpose
The edge function `send-access-confirmation` is deployed with `verify_jwt =
false`, so it accepts unauthenticated invocations. The previous trigger
versions tried to read a service role key from a config setting that is not
exposed in this project. This migration removes the Authorization header
entirely so the trigger works without any key resolution.

## Changes
- Replaces `notify_access_request_insert()` with a version that posts only
  `Content-Type: application/json` — no Authorization header.
- Trigger remains attached from the earlier migration.

## Security
- The edge function only sends a confirmation email to the email address in
  the payload; it performs no privileged reads or writes, so allowing
  unauthenticated invocations is acceptable.
- SECURITY DEFINER, search_path pinned to public, extensions.
*/

CREATE OR REPLACE FUNCTION public.notify_access_request_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  edge_url text := 'https://urxjusdqwbcyjlawnnot.supabase.co/functions/v1/send-access-confirmation';
BEGIN
  PERFORM net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
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
