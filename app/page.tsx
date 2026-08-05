import Link from 'next/link';
import styles from './theme.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Find the best card for your spending.</h1>
        <p className={styles.intro}>
          And the smartest way to redeem the miles you already have. No login, no account —
          every tool here works the same for everyone.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 280 }}>
          <Link href="/find-a-card" className={styles.buttonPrimary}>
            Find the best card for you →
          </Link>
          <Link href="/redeem-miles" className={styles.buttonSecondary}>
            Redeem your miles →
          </Link>
          <Link href="/award-search" className={styles.buttonSecondary}>
            Award search →
          </Link>
          <Link href="/concierge" className={styles.buttonSecondary}>
            Ask the AI concierge →
          </Link>
        </div>

        <p style={{ marginTop: 48, fontSize: 13, color: '#6b6659' }}>
          <Link href="/privacy" style={{ color: 'inherit' }}>Privacy Policy</Link>
          {' · '}
          <Link href="/terms" style={{ color: 'inherit' }}>Terms of Service</Link>
        </p>
      </div>
    </div>
  );
}
