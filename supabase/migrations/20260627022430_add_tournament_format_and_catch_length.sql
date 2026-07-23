ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS format_type text NOT NULL DEFAULT 'team',
  ADD COLUMN IF NOT EXISTS scoring_format text NOT NULL DEFAULT 'best5',
  ADD COLUMN IF NOT EXISTS big_bass_side_pot boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_length_inches numeric(4,1);

ALTER TABLE catches
  ADD COLUMN IF NOT EXISTS length_inches numeric(4,1);
