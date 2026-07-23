CREATE TABLE IF NOT EXISTS emergencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id uuid REFERENCES boats(id) ON DELETE SET NULL,
  boat_name text NOT NULL DEFAULT '',
  captain_name text NOT NULL DEFAULT '',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE emergencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_emergencies" ON emergencies
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "insert_emergencies" ON emergencies
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "update_emergencies" ON emergencies
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_emergencies" ON emergencies
  FOR DELETE TO authenticated USING (true);
