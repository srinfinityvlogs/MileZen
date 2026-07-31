import Link from 'next/link';
import { signOut } from '@/app/actions/auth';
import styles from './dashboard.module.css';

// Wraps every /dashboard/* page automatically — this is the one place a
// "Log out" button (and the shared fonts/header) needs to exist, rather
// than duplicating it on every individual dashboard page.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500;700&display=swap"
      />
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.brand}>
          MileZen
        </Link>
        <nav className={styles.nav}>
          <Link href="/dashboard/transactions" className={styles.navLink}>
            Transactions
          </Link>
          <Link href="/dashboard/cards/new" className={styles.navLink}>
            Add card
          </Link>
          <Link href="/dashboard/concierge" className={styles.navLink}>
            Concierge
          </Link>
          <Link href="/dashboard/statements" className={styles.navLink}>
            Statements
          </Link>
          <Link href="/dashboard/award-search" className={styles.navLink}>
            Award search
          </Link>
          <Link href="/dashboard/settings" className={styles.navLink}>
            Settings
          </Link>
          <form action={signOut}>
            <button type="submit" className={styles.logoutButton}>
              Log out
            </button>
          </form>
        </nav>
      </header>
      {children}
    </div>
  );
}
