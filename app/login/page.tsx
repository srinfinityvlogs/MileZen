'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Passwordless (magic link) sign-in. Deliberately no password field:
// - No password hashes for you to protect or leak
// - No reused-password risk from other breaches
// - Supabase handles the token issuance/expiry
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
      },
    });

    setStatus(error ? 'error' : 'sent');
  }

  return (
    <main style={{ padding: 40, fontFamily: 'system-ui', maxWidth: 400 }}>
      <h1>Sign in to MileZen</h1>
      {status === 'sent' ? (
        <p>Check your email for a sign-in link.</p>
      ) : (
        <form onSubmit={handleSignIn}>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginBottom: 12 }}
          />
          <button type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </button>
          {status === 'error' && <p style={{ color: 'crimson' }}>Something went wrong. Try again.</p>}
        </form>
      )}
    </main>
  );
}
