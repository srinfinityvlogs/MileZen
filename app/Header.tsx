import Link from 'next/link';
import styles from './theme.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand}>
          MileZen
        </Link>
        <nav className={styles.nav}>
          <Link href="/find-a-card" className={styles.navLink}>
            Find a card
          </Link>
          <Link href="/redeem-miles" className={styles.navLink}>
            Redeem miles
          </Link>
          <Link href="/award-search" className={styles.navLink}>
            Award search
          </Link>
          <Link href="/lounge-access" className={styles.navLink}>
            Lounge access
          </Link>
          <Link href="/concierge" className={styles.navLink}>
            Concierge
          </Link>
        </nav>
      </div>
    </header>
  );
}
