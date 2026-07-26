'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Server Action — runs server-side, clears the session cookie via
// Supabase's signOut(), then redirects. Used as a plain <form action={signOut}>
// so it works without any client-side JavaScript at all.
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
