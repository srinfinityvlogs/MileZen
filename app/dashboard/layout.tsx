import Link from 'next/link';
import { signOut } from '@/app/actions/auth';

// Wraps every /dashboard/* page automatically — this is the one place a
// "Log out" button needs to exist, rather than duplicating it on every
// individual dashboard page.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'system-ui' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 40px',
          borderBottom: '1px solid #eee',
        }}
      >
        <Link href="/dashboard" style={{ fontWeight: 'bold', textDecoration: 'none', color: 'inherit' }}>
          MileZen
        </Link>
        <form action={signOut}>
          <button type="submit">Log out</button>
        </form>
      </header>
      {children}
    </div>
  );
}
