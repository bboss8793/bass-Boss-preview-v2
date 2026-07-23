ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS start_time timestamptz,
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS final_countdown_seconds integer NOT NULL DEFAULT 60;
