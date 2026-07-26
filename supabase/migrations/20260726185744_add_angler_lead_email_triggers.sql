/*
# Add angler lead email triggers

Adds three AFTER INSERT trigger functions on `angler_leads` that send
transactional emails via pg_net + Resend (api key read from
private_config, the same pattern as send_confirmation_email — NOT
Deno.env, per the fix already applied to the edge functions).

1. `notify_angler_on_lead` — confirmation email TO the angler.
   Subject: "You're on the list, [Angler Name]!"
   Explains Bass Boss is set up club/team-first by their director/coach,
   their director has been notified, and once set up they just need the
   org code to join in the app. Frames it as how the system is organized,
   not a rejection or approval wait.

2. `notify_director_on_lead` — notification email TO director_contact,
   ONLY IF director_contact looks like a valid email. If only a phone
   number was given, the email is skipped (the lead row itself is the
   admin surface for phone-only contacts).
   Subject: "[Angler Name] wants to join your team on Bass Boss"
   Lets the director know an angler listed them and is waiting to join,
   with a link to getbassboss.com to set up their org if they haven't,
   and a note they can share their org code directly once set up.

3. `notify_scott_on_angler_lead` — notification email TO Scott
   (scott.gros@yahoo.com, same address as the access_requests Scott
   trigger) so a lead doesn't go unnoticed if the director never
   follows through. Separate from the director-request Scott trigger.
   Subject: "New angler lead: [Angler Name] — [Club/Team Name]"

All three are SECURITY DEFINER plpgsql functions that read
`resend_api_key` from `private_config` and POST to
https://api.resend.com/emails via net.http_post. They are resilient:
if the api key is missing they RAISE NOTICE and return NEW rather than
failing the insert. No changes to access_requests or its triggers.

Notes:
- Idempotent: uses CREATE OR REPLACE and DROP TRIGGER IF EXISTS.
- Email bodies are HTML + plain-text, matching the Bass Boss brand
  styling used by send-access-confirmation.
*/

-- ─────────────────────────────────────────────────────────────────────
-- 1) Angler confirmation email
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_angler_on_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_api_key text;
  v_first_name text;
  v_html text;
  v_text text;
BEGIN
  BEGIN
    SELECT value INTO v_api_key FROM private_config WHERE key = 'resend_api_key';
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_api_key := NULL;
  END;

  IF v_api_key IS NULL THEN
    RAISE NOTICE 'notify_angler_on_lead: resend_api_key not found in private_config, skipping';
    RETURN NEW;
  END IF;

  v_first_name := split_part(coalesce(NEW.angler_name, 'there'), ' ', 1);

  v_text := 'Hey ' || v_first_name || ',' || chr(10) || chr(10) ||
    'You''re on the list! Thanks for your interest in Bass Boss.' || chr(10) || chr(10) ||
    'Here''s how Bass Boss works: access is set up at the club or team level by your director or coach. ' ||
    'We''ve let your director know you''re ready to join ' || coalesce(NEW.club_or_team_name, 'your team') || '. ' ||
    'Once your director has your organization set up in Bass Boss, they''ll give you an org code — ' ||
    'just enter that code in the app to join, no approval wait needed.' || chr(10) || chr(10) ||
    'This is just how the system is organized (club-first, member-second) — you''re all set on your end.' || chr(10) || chr(10) ||
    'Tight lines,' || chr(10) || 'The Bass Boss Team' || chr(10) || 'getbassboss.com';

  v_html := '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0900;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;">' ||
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0900;"><tr><td align="center" style="padding:32px 16px;">' ||
    '<table width="480" cellpadding="0" cellspacing="0" style="background:#111008;border:1px solid #2a2000;border-radius:12px;">' ||
    '<tr><td style="padding:24px 28px 8px;text-align:center;"><span style="font-size:20px;font-weight:900;letter-spacing:-0.5px;color:#c8a030;">BASS BOSS</span></td></tr>' ||
    '<tr><td style="padding:0 28px 24px;">' ||
    '<p style="font-size:16px;line-height:1.5;color:#f0e8c8;">Hey ' || coalesce(NEW.angler_name, 'there') || ',</p>' ||
    '<p style="font-size:15px;line-height:1.6;color:#f0e8c8;">You''re on the list! Thanks for your interest in Bass Boss.</p>' ||
    '<p style="font-size:15px;line-height:1.6;color:#f0e8c8;">Here''s how Bass Boss works: access is set up at the <strong style="color:#f0c84a;">club or team level</strong> by your director or coach. We''ve let your director know you''re ready to join <strong style="color:#f0c84a;">' || coalesce(NEW.club_or_team_name, 'your team') || '</strong>. Once your director has your organization set up in Bass Boss, they''ll give you an org code — just enter that code in the app to join, no approval wait needed.</p>' ||
    '<p style="font-size:15px;line-height:1.6;color:#f0e8c8;">This is just how the system is organized (club-first, member-second) — you''re all set on your end.</p>' ||
    '<p style="font-size:15px;line-height:1.6;color:#f0e8c8;margin-bottom:24px;">Tight lines,<br><strong style="color:#f0c84a;">The Bass Boss Team</strong><br><a href="https://getbassboss.com" style="color:#c8a030;text-decoration:none;">getbassboss.com</a></p>' ||
    '</td></tr></table></td></tr></table></body></html>';

  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'Bass Boss <customerservice@getbassboss.com>',
      'to', NEW.angler_email,
      'subject', 'You''re on the list, ' || v_first_name || '!',
      'text', v_text,
      'html', v_html,
      'reply_to', 'customerservice@getbassboss.com'
    )
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_angler_lead_created ON angler_leads;
CREATE TRIGGER on_angler_lead_created
  AFTER INSERT ON angler_leads
  FOR EACH ROW EXECUTE FUNCTION notify_angler_on_lead();

-- ─────────────────────────────────────────────────────────────────────
-- 2) Director notification email (only if director_contact is an email)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_director_on_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_api_key text;
  v_is_email boolean;
  v_html text;
  v_text text;
BEGIN
  -- Only send when director_contact looks like a valid email.
  v_is_email := NEW.director_contact ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$';

  IF NOT v_is_email THEN
    RAISE NOTICE 'notify_director_on_lead: director_contact is not an email (%), skipping email', NEW.director_contact;
    RETURN NEW;
  END IF;

  BEGIN
    SELECT value INTO v_api_key FROM private_config WHERE key = 'resend_api_key';
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_api_key := NULL;
  END;

  IF v_api_key IS NULL THEN
    RAISE NOTICE 'notify_director_on_lead: resend_api_key not found in private_config, skipping';
    RETURN NEW;
  END IF;

  v_text := 'Hi ' || coalesce(NEW.director_name, 'there') || ',' || chr(10) || chr(10) ||
    NEW.angler_name || ' wants to join ' || coalesce(NEW.club_or_team_name, 'your team') || ' on Bass Boss and listed you as their director or coach.' || chr(10) || chr(10) ||
    'If you haven''t set up your organization in Bass Boss yet, you can get started at https://getbassboss.com — just request access and we''ll get you running.' || chr(10) || chr(10) ||
    'Once your organization is set up, you can share your org code directly with ' || NEW.angler_name || ' so they can join right away — no approval wait on their end.' || chr(10) || chr(10) ||
    'Angler contact: ' || NEW.angler_email || coalesce(' / ' || NEW.angler_phone, '') || chr(10) || chr(10) ||
    'Tight lines,' || chr(10) || 'The Bass Boss Team' || chr(10) || 'getbassboss.com';

  v_html := '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0900;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;">' ||
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0900;"><tr><td align="center" style="padding:32px 16px;">' ||
    '<table width="480" cellpadding="0" cellspacing="0" style="background:#111008;border:1px solid #2a2000;border-radius:12px;">' ||
    '<tr><td style="padding:24px 28px 8px;text-align:center;"><span style="font-size:20px;font-weight:900;letter-spacing:-0.5px;color:#c8a030;">BASS BOSS</span></td></tr>' ||
    '<tr><td style="padding:0 28px 24px;">' ||
    '<p style="font-size:16px;line-height:1.5;color:#f0e8c8;">Hi ' || coalesce(NEW.director_name, 'there') || ',</p>' ||
    '<p style="font-size:15px;line-height:1.6;color:#f0e8c8;"><strong style="color:#f0c84a;">' || NEW.angler_name || '</strong> wants to join <strong style="color:#f0c84a;">' || coalesce(NEW.club_or_team_name, 'your team') || '</strong> on Bass Boss and listed you as their director or coach.</p>' ||
    '<p style="font-size:15px;line-height:1.6;color:#f0e8c8;">If you haven''t set up your organization in Bass Boss yet, you can get started at <a href="https://getbassboss.com" style="color:#c8a030;">getbassboss.com</a> — just request access and we''ll get you running.</p>' ||
    '<p style="font-size:15px;line-height:1.6;color:#f0e8c8;">Once your organization is set up, you can share your org code directly with ' || NEW.angler_name || ' so they can join right away — no approval wait on their end.</p>' ||
    '<p style="font-size:13px;line-height:1.6;color:#a08040;margin-top:16px;">Angler contact: ' || NEW.angler_email || coalesce(' / ' || NEW.angler_phone, '') || '</p>' ||
    '<p style="font-size:15px;line-height:1.6;color:#f0e8c8;margin-bottom:24px;">Tight lines,<br><strong style="color:#f0c84a;">The Bass Boss Team</strong><br><a href="https://getbassboss.com" style="color:#c8a030;text-decoration:none;">getbassboss.com</a></p>' ||
    '</td></tr></table></td></tr></table></body></html>';

  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'Bass Boss <customerservice@getbassboss.com>',
      'to', NEW.director_contact,
      'subject', NEW.angler_name || ' wants to join your team on Bass Boss',
      'text', v_text,
      'html', v_html,
      'reply_to', 'customerservice@getbassboss.com'
    )
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_angler_lead_notify_director ON angler_leads;
CREATE TRIGGER on_angler_lead_notify_director
  AFTER INSERT ON angler_leads
  FOR EACH ROW EXECUTE FUNCTION notify_director_on_lead();

-- ─────────────────────────────────────────────────────────────────────
-- 3) Scott notification (so a lead is never lost if director no-shows)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_scott_on_angler_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_api_key text;
  v_html text;
  v_text text;
  v_scott_email text := 'scott.gros@yahoo.com';
BEGIN
  BEGIN
    SELECT value INTO v_api_key FROM private_config WHERE key = 'resend_api_key';
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_api_key := NULL;
  END;

  IF v_api_key IS NULL THEN
    RAISE NOTICE 'notify_scott_on_angler_lead: resend_api_key not found in private_config, skipping';
    RETURN NEW;
  END IF;

  v_text := 'New angler lead received.' || chr(10) || chr(10) ||
    'Angler: ' || NEW.angler_name || ' <' || NEW.angler_email || '>' || chr(10) ||
    'Phone: ' || coalesce(NEW.angler_phone, '—') || chr(10) ||
    'Club/Team: ' || NEW.club_or_team_name || chr(10) ||
    'Director: ' || NEW.director_name || chr(10) ||
    'Director contact: ' || NEW.director_contact || chr(10) || chr(10) ||
    'Note: this is an angler lead (member-side), separate from director access requests. ' ||
    'If the director hasn''t set up the org, you may want to follow up directly.';

  v_html := '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0900;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;">' ||
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0900;"><tr><td align="center" style="padding:32px 16px;">' ||
    '<table width="520" cellpadding="0" cellspacing="0" style="background:#111008;border:1px solid #2a2000;border-radius:12px;">' ||
    '<tr><td style="padding:24px 28px 8px;text-align:center;"><span style="font-size:20px;font-weight:900;letter-spacing:-0.5px;color:#c8a030;">BASS BOSS</span></td></tr>' ||
    '<tr><td style="padding:0 28px 8px;">' ||
    '<p style="font-size:16px;font-weight:bold;color:#f0c84a;margin:0 0 16px;">New Angler Lead</p>' ||
    '<table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">' ||
    '<tr><td style="padding:4px 0;font-size:14px;color:#8a7a40;width:140px;vertical-align:top;">Angler</td><td style="padding:4px 0;font-size:14px;color:#f0e8c8;">' || NEW.angler_name || ' &lt;' || NEW.angler_email || '&gt;</td></tr>' ||
    '<tr><td style="padding:4px 0;font-size:14px;color:#8a7a40;width:140px;vertical-align:top;">Phone</td><td style="padding:4px 0;font-size:14px;color:#f0e8c8;">' || coalesce(NEW.angler_phone, '—') || '</td></tr>' ||
    '<tr><td style="padding:4px 0;font-size:14px;color:#8a7a40;width:140px;vertical-align:top;">Club/Team</td><td style="padding:4px 0;font-size:14px;color:#f0e8c8;">' || NEW.club_or_team_name || '</td></tr>' ||
    '<tr><td style="padding:4px 0;font-size:14px;color:#8a7a40;width:140px;vertical-align:top;">Director</td><td style="padding:4px 0;font-size:14px;color:#f0e8c8;">' || NEW.director_name || '</td></tr>' ||
    '<tr><td style="padding:4px 0;font-size:14px;color:#8a7a40;width:140px;vertical-align:top;">Director contact</td><td style="padding:4px 0;font-size:14px;color:#f0e8c8;">' || NEW.director_contact || '</td></tr>' ||
    '</table>' ||
    '<p style="font-size:13px;color:#a08040;margin:0;line-height:1.5;">This is an angler lead (member-side), separate from director access requests. If the director hasn''t set up the org, you may want to follow up directly.</p>' ||
    '</td></tr></table></td></tr></table></body></html>';

  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'Bass Boss <customerservice@getbassboss.com>',
      'to', v_scott_email,
      'subject', 'New angler lead: ' || NEW.angler_name || ' — ' || NEW.club_or_team_name,
      'text', v_text,
      'html', v_html,
      'reply_to', 'customerservice@getbassboss.com'
    )
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_angler_lead_notify_scott ON angler_leads;
CREATE TRIGGER on_angler_lead_notify_scott
  AFTER INSERT ON angler_leads
  FOR EACH ROW EXECUTE FUNCTION notify_scott_on_angler_lead();
