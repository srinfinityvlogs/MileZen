import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NewCardForm } from './NewCardForm';
import styles from '../../dashboard.module.css';

export default async function NewCardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // card_products is global reference data (no RLS — public read for any
  // authenticated user, see schema.sql section 5), so this returns the
  // full catalog, not anything user-specific.
  const { data: cardProducts, error } = await supabase
    .from('card_products')
    .select('id, name, network, annual_fee, issuers(name)')
    .order('name');

  if (error) {
    // Logged server-side (visible in your `npm run dev` terminal output) —
    // never show raw DB error details to the client.
    console.error('Failed to load card_products', error.message);
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Add a card</h1>
      <p className={styles.subtitle}>Pick a card from the catalog and add your own instance of it.</p>
      {error ? (
        <p className={styles.errorText}>
          Could not load the card catalog. Check your terminal for the exact error.
        </p>
      ) : !cardProducts || cardProducts.length === 0 ? (
        <p className={styles.empty}>
          No card products in the catalog yet. Run <code>npm run ingest:reference</code> after
          populating <code>data/card-products.json</code> (see README).
        </p>
      ) : (
        <NewCardForm
          cardProducts={cardProducts.map((cp: any) => ({
            id: cp.id,
            label: `${cp.issuers?.name ?? ''} ${cp.name}`.trim(),
            annualFee: cp.annual_fee,
          }))}
        />
      )}
    </main>
  );
}
