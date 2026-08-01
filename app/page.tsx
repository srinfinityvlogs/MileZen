import Link from 'next/link';

// No login anywhere in this app — every page here is a public tool.
export default function Home() {
  return (
    <main style={{ padding: 40, fontFamily: 'system-ui', maxWidth: 480 }}>
      <h1>MileZen</h1>
      <p>Find the best card for your spending, and the smartest way to redeem miles you already have.</p>

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

      <p style={{ marginTop: 12 }}>
        <Link
          href="/award-search"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            border: '1px solid #111',
            color: '#111',
            textDecoration: 'none',
          }}
        >
          Award search →
        </Link>
      </p>

      <p style={{ marginTop: 12 }}>
        <Link
          href="/concierge"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            border: '1px solid #111',
            color: '#111',
            textDecoration: 'none',
          }}
        >
          Ask the AI concierge →
        </Link>
      </p>

      <p style={{ marginTop: 40, fontSize: 13, color: '#888' }}>
        <Link href="/privacy" style={{ color: 'inherit' }}>Privacy Policy</Link>
        {' · '}
        <Link href="/terms" style={{ color: 'inherit' }}>Terms of Service</Link>
      </p>
    </main>
  );
}
