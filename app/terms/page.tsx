import Link from 'next/link';
import styles from '../legal/legal.module.css';

export const metadata = { title: 'Terms of Service — MileZen' };

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=IBM+Plex+Sans:wght@400;600&display=swap"
      />
      <div className={styles.container}>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.updated}>Last updated: [DATE — fill in before publishing]</p>

        <div className={styles.notice}>
          <strong>Before you rely on this:</strong> this is a good-faith draft, not a substitute
          for legal advice. Have a lawyer review this — particularly the liability, disclaimer,
          and governing-law sections — before treating it as binding, especially once real
          affiliate partnerships and real users are involved.
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Acceptance of terms</h2>
          <p className={styles.body}>
            By creating an account or using MileZen's public tools (including the card-search
            feature, which requires no account), you agree to these terms. If you don't agree,
            please don't use the service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. What MileZen is</h2>
          <p className={styles.body}>
            MileZen is a personal tool for tracking credit cards, loyalty points, and reward
            redemptions, with an AI concierge that answers questions about your own data. It also
            offers a public card-comparison tool that recommends cards based on your stated
            spending category and budget, with links to apply through our affiliate partners.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Not financial advice</h2>
          <p className={styles.body}>
            MileZen is not a bank, a registered financial advisor, or a credit counselor. Nothing
            in the ledger, the AI concierge's answers, or the card-search results constitutes
            financial, credit, or legal advice. Card recommendations reflect published reward
            rates and annual fees as we've recorded them — they do not guarantee approval, the
            best available deal in the market, or that the terms haven't changed since we last
            checked. Always confirm current rates, fees, and terms directly with the card issuer
            before applying.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Affiliate relationships</h2>
          <p className={styles.body}>
            MileZen may earn a commission when you apply for a card through an "Apply Now" link on
            our card-search tool. This never changes which cards are shown or how they're ranked —
            rankings are based purely on the reward rate for the category you searched.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Data accuracy</h2>
          <p className={styles.body}>
            Card details, reward rates, transfer ratios, and award chart data are maintained by us
            and may be out of date. Banks and loyalty programmes change their terms without
            notice. We try to keep this current but make no guarantee of accuracy — don't make a
            financial decision based solely on what MileZen shows without verifying it yourself.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Your account</h2>
          <ul className={styles.list}>
            <li>You must be at least 18 to create an account.</li>
            <li>You're responsible for keeping access to your email (used for sign-in) secure.</li>
            <li>One account per person — don't share credentials or access with others.</li>
            <li>Don't attempt to access another user's data or interfere with the service's security.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Disclaimer of warranties</h2>
          <p className={styles.body}>
            MileZen is provided "as is," without warranty of any kind. We don't guarantee the
            service will be uninterrupted, error-free, or that any specific reward calculation is
            correct.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Limitation of liability</h2>
          <p className={styles.body}>
            To the fullest extent permitted by law, MileZen is not liable for any financial loss,
            missed reward, denied application, or other damages arising from your use of the
            service or reliance on information it provides.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Changes to the service or these terms</h2>
          <p className={styles.body}>
            We may change or discontinue features, and may update these terms. If we do, we'll
            update the date at the top of this page.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>10. Governing law</h2>
          <p className={styles.body}>
            [JURISDICTION — fill in before publishing, e.g. "the laws of India" — this should
            match wherever the business is actually established, confirmed with a lawyer.]
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Contact</h2>
          <p className={styles.body}>[YOUR CONTACT EMAIL — fill in before publishing]</p>
        </section>

        <nav className={styles.footerNav}>
          <Link href="/">Home</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/find-a-card">Find a card</Link>
        </nav>
      </div>
    </div>
  );
}
