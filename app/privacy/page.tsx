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
          description of what MileZen actually does with your data today, written directly from
          its source code. It is not a substitute for legal advice. Have a lawyer review this
          against applicable law (e.g. India's DPDP Act, and wherever else your users are located)
          before treating it as your final, binding policy — especially once real affiliate
          partnerships and real users beyond testing are involved.
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What we collect</h2>
          <p className={styles.body}>Depending on how you use MileZen:</p>
          <ul className={styles.list}>
            <li>
              <strong>Account:</strong> your email address, used only for passwordless sign-in
              (magic link). We never ask for or store a password.
            </li>
            <li>
              <strong>Ledger data you enter:</strong> card nicknames, the <strong>last 4 digits
              only</strong> of your cards (never a full card number), transaction amounts,
              merchants, dates, categories, and loyalty point balances.
            </li>
            <li>
              <strong>Uploaded statement PDFs</strong>, if you use that feature — stored in
              private, access-controlled storage. These are read using pattern-matching only;
              they are never sent to any AI model or third party.
            </li>
            <li>
              <strong>AI concierge conversations</strong> — only the final text exchange, never
              the underlying tool calls or raw data used to generate it. Automatically deleted
              after 30 days. You can turn the concierge off entirely in your account.
            </li>
            <li>
              <strong>Public card-search usage</strong> (on the "Find a card" tool) — which
              category and fee range were searched, and which card's "Apply Now" link was
              clicked. This is <strong>not linked to your identity</strong> — it works whether or
              not you're signed in, and we don't use cookies or fingerprinting to track visitors
              across sessions.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>How we use it</h2>
          <ul className={styles.list}>
            <li>To operate your personal ledger and show you your own balances and history.</li>
            <li>To power the AI concierge's answers about your own cards and points.</li>
            <li>To send you reminder emails you've set (annual fees, point expiry).</li>
            <li>To recommend cards on the public search tool, ranked by actual reward rate for the category you chose.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Who we share it with</h2>
          <p className={styles.body}>We use a small number of service providers to run MileZen:</p>
          <ul className={styles.list}>
            <li>
              <strong>Supabase</strong> — hosts our database, authentication, and file storage.
              Your data is isolated from every other user's at the database level (Row Level
              Security), not just in application code.
            </li>
            <li>
              <strong>Groq</strong> — powers the AI concierge. Only a small, structured slice of
              your data is sent per question (e.g. your balances, if you ask about balances) —
              never raw statements or full transaction history. Per Groq's own data policy at the
              time this was written, customer inference data is not retained or used for
              training; we recommend checking their current terms directly, since these policies
              can change.
            </li>
            <li>
              <strong>Resend</strong> — delivers reminder and sign-in emails.
            </li>
            <li>
              <strong>Card issuers</strong> — if you click "Apply Now" on the card-search tool, you
              leave MileZen and go to that issuer's own site or an affiliate partner's page, which
              has its own privacy practices we don't control. We may earn a commission from that
              click — see the disclosure on that page.
            </li>
          </ul>
          <p className={styles.body}>We do not sell your data, and we do not share it with advertisers.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Security</h2>
          <p className={styles.body}>
            Your ledger data is protected by Row Level Security at the database layer — meaning
            even in the unlikely event of a bug in our application code, the database itself
            enforces that you can only ever see your own data. Data is encrypted in transit and at
            rest via our hosting provider's infrastructure.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>How long we keep it</h2>
          <ul className={styles.list}>
            <li>Ledger data (cards, transactions, points): kept until you delete it or close your account.</li>
            <li>Uploaded statements: kept until you delete them.</li>
            <li>AI concierge conversation history: auto-deleted after 30 days.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Your rights</h2>
          <p className={styles.body}>
            You can access and review your own data at any time by signing in. To request
            correction or deletion of your account and associated data, contact us at the address
            below — <strong>this is currently a manual process</strong>, not yet a self-service
            "delete my account" button in the product.
          </p>
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
