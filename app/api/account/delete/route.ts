import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// POST /api/account/delete
//
// SECURITY-CRITICAL: this is one of the few legitimate places a
// user-facing route uses the service-role client — deleting an
// auth.users row requires admin privileges no ordinary session has.
// The user_id being deleted is ALWAYS taken from the caller's own
// RLS-scoped session (never from the request body or any client-supplied
// value) — this is what makes it safe. If that pattern ever changes to
// accept a user-supplied id, this becomes an any-user-can-delete-any-
// account vulnerability.
//
// Every user-data table (profiles, user_cards, statements, transactions,
// point_ledger, reminders, ai_messages) has `on delete cascade` on its
// auth.users foreign key (see schema.sql) — deleting the auth user alone
// removes all of it automatically. Only Supabase Storage objects (the
// uploaded statement PDFs) live outside that cascade and need explicit
// cleanup here. audit_log intentionally does NOT cascade (`on delete set
// null`) — it keeps a trace that *an* account was deleted without
// retaining any of that user's actual data, which is the point of an
// audit log surviving the thing it's auditing.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // 1. Clean up Storage — not covered by the Postgres cascade below.
  try {
    const { data: files } = await serviceClient.storage.from('statements').list(user.id);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${user.id}/${f.name}`);
      await serviceClient.storage.from('statements').remove(paths);
    }
  } catch (err) {
    // Don't block account deletion over a storage cleanup failure — log
    // it, but the account deletion itself (the part the user actually
    // asked for and is waiting on) should still proceed.
    console.error('Failed to clean up storage during account deletion', {
      userId: user.id,
      message: (err as Error).message,
    });
  }

  // 2. Record that an account was deleted — before deleting it, since
  // audit_log.user_id will be nulled by the FK once the user is gone.
  await serviceClient.from('audit_log').insert({
    user_id: user.id,
    action: 'account_delete',
  });

  // 3. Delete the auth user — cascades to every user-data table.
  const { error } = await serviceClient.auth.admin.deleteUser(user.id);

  if (error) {
    console.error('Account deletion failed', { userId: user.id, message: error.message });
    return NextResponse.json({ error: 'Could not delete account. Please try again or contact support.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
