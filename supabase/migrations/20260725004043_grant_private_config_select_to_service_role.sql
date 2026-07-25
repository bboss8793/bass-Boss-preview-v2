-- The send-access-confirmation edge function reads the Resend API key from
-- private_config via the REST API using the service_role key. The service_role
-- bypasses RLS but still needs the underlying table SELECT grant. Previously
-- only the postgres role had SELECT on private_config, so the edge function
-- got a 403. Grant SELECT to service_role (anon/authenticated remain blocked
-- by RLS since there are no policies for them).

GRANT SELECT ON TABLE private_config TO service_role;
