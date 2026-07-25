import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Exchanges the magic-link code for a session cookie. This runs server-side
// so the session token never passes through client-side JS / localStorage —
// it's set as an HttpOnly cookie by Supabase's SSR helper.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectedFrom = searchParams.get('redirectedFrom') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectedFrom}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
