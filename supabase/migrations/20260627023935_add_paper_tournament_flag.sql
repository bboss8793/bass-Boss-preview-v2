ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS is_paper_tournament boolean NOT NULL DEFAULT false;
