/*
# Add Tier and Billing Cycle to Organizations

## Overview
Adds plan tier tracking to the organizations table so the app can
display usage stats and soft-enforce per-plan limits on anglers and
tournaments.

## Modified Tables

### organizations (added 2 columns)
- `tier` — text, NOT NULL, default 'pro'
  Values: 'starter' | 'standard' | 'pro'
  All existing and new orgs default to 'pro' to cover the beta period.
  When beta ends, a director's tier will be set to the plan they
  purchased at registration time.
- `billing_cycle` — text, default 'annual'
  Values: 'annual' | 'monthly'
  Informational only for now; used by future billing integrations.

## Tier Limits (enforced in frontend only — soft enforcement)
- starter:  20 anglers, 6 tournaments/year
- standard: 35 anglers, unlimited tournaments
- pro:       unlimited anglers, unlimited tournaments

## Beta Behavior
All orgs currently have tier = 'pro' (the default). No limits are
applied or banners shown for 'pro' orgs. When beta ends, individual
orgs will be migrated to their purchased tier.

## Security
No new RLS policies needed. Existing director-scoped UPDATE policy on
organizations already covers updates to these columns.

## Data Safety
Uses ADD COLUMN IF NOT EXISTS — safe to re-run. Existing rows get
tier = 'pro' and billing_cycle = 'annual' via column defaults.
*/

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'pro'
    CHECK (tier IN ('starter', 'standard', 'pro')),
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'annual'
    CHECK (billing_cycle IN ('annual', 'monthly'));
