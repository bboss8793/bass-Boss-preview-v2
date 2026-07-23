-- Add app_type column to tournaments to separate club vs team tournaments
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS app_type text NOT NULL DEFAULT 'team';

-- Existing tournaments stay as 'team' (the default covers them)
-- Club dashboard will insert with app_type = 'club'
