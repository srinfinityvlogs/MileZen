import Link from 'next/link';
import styles from '../legal/legal.module.css';

export const metadata = { title: 'Privacy Policy — MileZen' };

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=IBM+Plex+Sans:wght@400;600&display=swap"
      />
      <div className={styles.container}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: [DATE — fill in before publishing]</p>

        <div className={styles.notice}>
          <strong>Before you rely on this:</strong> this policy is a good-faith, accurate
          description of what MileZen actually does today, written directly from its source code.
          It is not a substitute for legal advice. Have a lawyer review this before treating it as
          your final, binding policy — especially once real affiliate partnerships are in place.
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>There's no account here</h2>
          <p className={styles.body}>
            MileZen has no sign-in, no user accounts, and stores no personal profile about you.
            Every tool — card search, miles redemption charts, award search, and the AI concierge
            — works the same for every visitor, with nothing tied to your identity.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What we collect</h2>
          <ul className={styles.list}>
            <li>
              <strong>Public tool usage</strong> (on the "Find a card" tool) — which category and
              fee range were searched, and which card's "Apply Now" link was clicked. This is{' '}
              <strong>not linked to your identity</strong> in any way — we don't use cookies,
              accounts, or fingerprinting to track visitors across sessions or visits.
            </li>
            <li>
              <strong>AI concierge conversations</strong> exist only in your browser tab for the
              length of that conversation. Closing the tab forgets it — nothing is written to a
              database on our end.
            </li>
            <li>
              Standard technical logs our hosting provider generates for operating the service
              (e.g. request logs for debugging), not something we actively collect or analyze
              about individual visitors.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Who we share it with</h2>
          <ul className={styles.list}>
            <li>
              <strong>Supabase</strong> — hosts our card/award-chart catalog database. It contains
              no personal data about visitors — only the public reference catalog every visitor
              reads the same way.
            </li>
            <li>
              <strong>Groq</strong> — powers the AI concierge. Whatever you type into that chat is
              sent to Groq to generate a response. Per Groq's own data policy at the time this was
              written, customer inference data is not retained or used for training; we recommend
              checking their current terms directly, since these policies can change. Don't type
              anything into the concierge you wouldn't want processed by a third-party AI service.
            </li>
            <li>
              <strong>Card issuers / affiliate partners</strong> — if you click "Apply Now," you
              leave MileZen for that issuer's own site, which has its own privacy practices we
              don't control. We may earn a commission from that click — see the disclosure on that
              page.
            </li>
          </ul>
          <p className={styles.body}>We do not sell data, and we do not share anything with advertisers.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Children's privacy</h2>
          <p className={styles.body}>
            MileZen is not directed at, and we do not knowingly collect data from, anyone under
            18.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Changes to this policy</h2>
          <p className={styles.body}>
            If this policy changes materially, we'll update the date at the top of this page.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Contact</h2>
          <p className={styles.body}>[YOUR CONTACT EMAIL — fill in before publishing]</p>
        </section>

        <nav className={styles.footerNav}>
          <Link href="/">Home</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/find-a-card">Find a card</Link>
        </nav>
      </div>
    </div>
  );
}
