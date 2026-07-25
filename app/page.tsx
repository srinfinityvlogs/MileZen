import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: 40, fontFamily: 'system-ui' }}>
      <h1>MileZen</h1>
      <p>Every card, point, and mile — in one ledger.</p>
      <Link href="/login">Sign in</Link>
    </main>
  );
}
