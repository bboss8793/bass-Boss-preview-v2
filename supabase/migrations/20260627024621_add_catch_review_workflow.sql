ALTER TABLE catches
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS rejection_reason text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('catch-photos', 'catch-photos', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/heic'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can upload catch photos' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can upload catch photos" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = ''catch-photos'')';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view catch photos' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view catch photos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = ''catch-photos'')';
  END IF;
END $$;
