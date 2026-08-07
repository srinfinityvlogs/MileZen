import { createClient } from '@/lib/supabase/server';
import { getLoungeData } from '@/lib/lounge-data';
import styles from './lounge-access.module.css';

interface LoungeCard {
  id: string;
  name: string;
  issuerName: string;
  annualFee: number;
  currency: string;
  affiliateLink: string;
}

// Public page — no auth, server-rendered. Lounge network/airport content
// comes from data/lounge-networks.json (static, no DB round trip — see
// lib/lounge-data.ts). The card list is the one piece that hits
// Supabase, filtered to cards flagged lounge_access = true in the
// catalog (data/card-products.json -> loungeAccess, same pattern as
// every other card field).
export default async function LoungeAccessPage() {
  const { networks } = getLoungeData();

  const supabase = await createClient();
  const { data } = await supabase
    .from('card_products')
    .select('id, name, annual_fee, currency, affiliate_link, issuers(name)')
    .eq('lounge_access', true)
    .not('affiliate_link', 'is', null);

  const loungeCards: LoungeCard[] = (data ?? []).map((card: any) => ({
    id: card.id,
    name: card.name,
    issuerName: card.issuers?.name ?? '',
    annualFee: card.annual_fee,
    currency: card.currency,
    affiliateLink: card.affiliate_link,
  }));

  return (
    <div className={styles.shell}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Deep dive</p>
        <h1 className={styles.title}>Lounge Bookings, Explained</h1>
        <p className={styles.subtitle}>
          Most airport lounges in India run on one of three back-end
          networks. Here's how each one actually works, and which cards
          get you in for free.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>How to book, network by network</h2>
        <div className={styles.networkGrid}>
          {networks.map((network) => (
            <article key={network.id} className={styles.networkCard}>
              <h3 className={styles.networkName}>{network.name}</h3>
              <p className={styles.networkSummary}>{network.summary}</p>

              <h4 className={styles.airportsHeading}>Airports covered</h4>
              <ul className={styles.airportList}>
                {network.airports.map((airport) => (
                  <li key={airport.city} className={styles.airportItem}>
                    {airport.city}
                    {airport.note && (
                      <span className={styles.airportNote}> · {airport.note}</span>
                    )}
                  </li>
                ))}
              </ul>
              {network.airportsNote && (
                <p className={styles.airportsFootnote}>{network.airportsNote}</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Cards that include lounge access</h2>
        {loungeCards.length === 0 ? (
          <p className={styles.emptyState}>
            No cards with lounge access are in the catalog yet.
          </p>
        ) : (
          <div className={styles.cardGrid}>
            {loungeCards.map((card) => (
              <article key={card.id} className={styles.cardTile}>
                <h3 className={styles.cardName}>
                  {card.issuerName} {card.name}
                </h3>
                <p className={styles.cardIssuer}>
                  {card.annualFee === 0
                    ? 'Free'
                    : `${card.currency}${card.annualFee.toLocaleString()} / year`}
                </p>
                <a
                  href={`/api/apply/${card.id}?category=${encodeURIComponent('Lounge Access')}`}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className={styles.applyLink}
                >
                  Apply Now
                </a>
              </article>
            ))}
          </div>
        )}

        <p className={styles.airportsFootnote} style={{ marginTop: '1.5rem' }}>
          MileZen may earn a commission if you apply for a card through these links, at no
          cost to you. This never affects which cards are shown.{' '}
          <a href="/privacy" style={{ color: 'inherit' }}>Privacy Policy</a>
          {' \u00b7 '}
          <a href="/terms" style={{ color: 'inherit' }}>Terms of Service</a>
        </p>
      </section>
    </div>
  );
}
