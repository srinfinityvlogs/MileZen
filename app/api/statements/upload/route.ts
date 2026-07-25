import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB, matches extractText.ts limit

// POST /api/statements/upload  (multipart/form-data, field name "file")
//
// Deliberately strict validation before anything touches storage or the DB:
//   - Content-type AND magic-byte check (never trust the client-declared type)
//   - Size cap enforced server-side, not just left to the client
//   - Path is namespaced under the user's own auth.uid(), matching the
//     storage RLS policy in supabase/storage_policies.sql
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const userCardId = formData.get('userCardId'); // optional, string | null

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Magic-byte check: real PDFs start with "%PDF-". Don't trust file.type,
  // which is just whatever the browser/client claimed.
  const isPdf = buffer.subarray(0, 5).toString('utf-8') === '%PDF-';
  if (!isPdf) {
    return NextResponse.json({ error: 'File is not a valid PDF' }, { status: 400 });
  }

  const path = `${user.id}/${randomUUID()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from('statements')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: false });

  if (uploadError) {
    console.error('Statement upload failed', { userId: user.id, message: uploadError.message });
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const { data: statement, error: insertError } = await supabase
    .from('statements')
    .insert({
      user_id: user.id,
      user_card_id: typeof userCardId === 'string' ? userCardId : null,
      storage_path: path,
      source: 'upload',
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !statement) {
    // Clean up the orphaned file if the DB insert failed, so storage and
    // DB state don't drift out of sync.
    await supabase.storage.from('statements').remove([path]);
    return NextResponse.json({ error: 'Failed to record statement' }, { status: 500 });
  }

  return NextResponse.json({ statementId: statement.id }, { status: 201 });
}
