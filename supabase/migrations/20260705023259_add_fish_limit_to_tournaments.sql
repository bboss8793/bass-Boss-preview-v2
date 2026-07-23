/*
# Add fish_limit to tournaments

Adds a fish_limit column to the tournaments table so each tournament
can be configured for either a 3-fish or 5-fish limit.

## Changes

### Modified Tables
- `tournaments`
  - Added `fish_limit` (integer, NOT NULL, DEFAULT 5)
    Controls how many fish count toward a team's limit.
    Existing tournaments default to 5 (current behavior preserved).

## Notes
1. Idempotent — uses ADD COLUMN IF NOT EXISTS so safe to re-apply.
2. No RLS changes required — existing tournament policies cover this column.
*/

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS fish_limit integer NOT NULL DEFAULT 5;
