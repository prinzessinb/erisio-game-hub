
CREATE POLICY "branding_public_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'branding');
CREATE POLICY "branding_public_insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'branding');
CREATE POLICY "branding_public_update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'branding') WITH CHECK (bucket_id = 'branding');
CREATE POLICY "branding_public_delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'branding');
