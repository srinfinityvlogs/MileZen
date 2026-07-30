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
      <p>Every card, point, and mile - in one ledger.</p>

      <p style={{ marginTop: 24 }}>
        <Link
          href="/find-a-card"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: '#111',
            color: '#fff',
            textDecoration: 'none',
          }}
        >
          Find the best card for you →
        </Link>
      </p>

      <p style={{ marginTop: 12 }}>
        <Link
          href="/redeem-miles"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            border: '1px solid #111',
            color: '#111',
            textDecoration: 'none',
          }}
        >
          Redeem your miles →
        </Link>
      </p>

      <p style={{ marginTop: 16 }}>
        {user ? (
          <Link href="/dashboard">Go to dashboard</Link>
        ) : (
          <>
            Already tracking your cards? <Link href="/login">Sign in</Link>
          </>
        )}
      </p>

      <p style={{ marginTop: 40, fontSize: 13, color: '#888' }}>
        <Link href="/privacy" style={{ color: 'inherit' }}>Privacy Policy</Link>
        {' · '}
        <Link href="/terms" style={{ color: 'inherit' }}>Terms of Service</Link>
      </p>
    </main>
  );
}
