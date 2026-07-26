import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

// Server Component — checks the session server-side so the correct link
// (Sign in vs Go to dashboard) renders on first paint, no client-side
// flicker. Previously this page was static and always showed "Sign in"
// regardless of an existing valid session, which looked like a broken
// login even though the session itself was perfectly fine.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main style={{ padding: 40, fontFamily: 'system-ui' }}>
      <h1>MileZen</h1>
      <p>Every card, point, and mile — in one ledger.</p>
      {user ? (
        <Link href="/dashboard">Go to dashboard</Link>
      ) : (
        <Link href="/login">Sign in</Link>
      )}
    </main>
  );
}
