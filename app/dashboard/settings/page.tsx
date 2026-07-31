import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DeleteAccountForm } from './DeleteAccountForm';
import styles from '../dashboard.module.css';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Settings</h1>
      <p className={styles.subtitle}>Signed in as {user.email}</p>

      <h2 className={styles.sectionTitle}>Delete account</h2>
      <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#6b6659', maxWidth: '60ch', marginBottom: 16 }}>
        This permanently deletes your account and everything tied to it — cards, transactions,
        point balances, uploaded statements, reminders, and AI concierge chat history. This
        cannot be undone.
      </p>

      <DeleteAccountForm userEmail={user.email ?? ''} />
    </main>
  );
}
