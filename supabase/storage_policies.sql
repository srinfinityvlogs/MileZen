-- ============================================================================
-- MileZen — Storage bucket + RLS policies for uploaded statement PDFs
-- ============================================================================
-- Run this after creating a bucket named 'statements' in the Supabase
-- dashboard (Storage > New bucket > uncheck "Public bucket").
--
-- Convention enforced here: every uploaded file's path MUST start with the
-- uploading user's own auth.uid(), e.g.  <user_id>/<uuid>.pdf
-- This lets us write simple, airtight RLS policies based on the path alone.
-- ============================================================================

create policy "statements_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'statements'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "statements_select_own_folder"
on storage.objects for select
to authenticated
using (
  bucket_id = 'statements'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "statements_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'statements'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- No update policy: uploaded statements are immutable. If a user uploads
-- the wrong file, they delete it and upload a new one (new UUID path).
