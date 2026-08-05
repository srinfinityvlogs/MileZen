import Link from 'next/link';
import styles from '../legal/legal.module.css';

export const metadata = { title: 'Terms of Service — MileZen' };

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.updated}>Last updated: [DATE — fill in before publishing]</p>

        <div className={styles.notice}>
          <strong>Before you rely on this:</strong> this is a good-faith draft, not a substitute
          for legal advice. Have a lawyer review this — particularly the liability, disclaimer,
          and governing-law sections — before treating it as binding, especially once real
          affiliate partnerships are involved.
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Acceptance of terms</h2>
          <p className={styles.body}>
            By using any of MileZen's tools — card search, miles redemption charts, award search,
            or the AI concierge, all of which require no account or sign-in — you agree to these
            terms. If you don't agree, please don't use the service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. What MileZen is</h2>
          <p className={styles.body}>
            MileZen is a free set of public tools for finding the best credit card for your
            spending and figuring out how to redeem airline miles — a card-comparison search with
            affiliate apply links, a published-award-chart lookup, a multi-currency transfer-path
            search, and an AI concierge that answers questions using the same underlying catalog.
            None of it requires an account.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Not financial advice</h2>
          <p className={styles.body}>
            MileZen is not a bank, a registered financial advisor, or a credit counselor. Nothing
            in the card-search results, the award charts, or the AI concierge's answers
            constitutes financial, credit, or legal advice. Card recommendations reflect published
            reward rates and annual fees as we've recorded them — they do not guarantee approval,
            the best available deal in the market, or that the terms haven't changed since we last
            checked. Always confirm current rates, fees, and terms directly with the card issuer
            or airline before applying or redeeming.
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
          <h2 className={styles.sectionTitle}>6. Acceptable use</h2>
          <ul className={styles.list}>
            <li>Don't attempt to scrape, abuse, or overload the service in a way that degrades it for other visitors.</li>
            <li>Don't attempt to interfere with the service's security.</li>
            <li>Don't submit anything to the AI concierge you wouldn't want processed by a third-party AI provider — see the Privacy Policy for what that involves.</li>
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
