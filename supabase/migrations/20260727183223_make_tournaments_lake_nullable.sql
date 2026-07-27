-- The old `lake` column on tournaments is NOT NULL but no longer populated
-- by the app (inserts use lake_id/lake_name instead). Make it nullable so
-- new tournaments can be created without a value for the legacy column.
-- Existing rows keep their data; the column is retained for any external
-- consumers that may still read it.

ALTER TABLE tournaments ALTER COLUMN lake DROP NOT NULL;
