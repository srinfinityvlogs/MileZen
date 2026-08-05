'use client';

import { useState } from 'react';
import styles from '../theme.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ConciergePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content, history: messages }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }
      setMessages([...nextMessages, { role: 'assistant', content: data.reply }]);
    } catch {
      setError('Could not reach the concierge.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Concierge</h1>
        <p className={styles.intro}>
          Ask which card is best for a category, or how to redeem miles for a route. No account
          needed — nothing here is saved once you close this tab.
        </p>

        <div className={styles.chatWindow}>
          {messages.length === 0 && !loading && (
            <p className={styles.chatThinking}>Ask something to get started.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={styles.chatMessage}>
              <p className={`${styles.chatRole} ${m.role === 'assistant' ? styles.chatRoleAssistant : ''}`}>
                {m.role === 'user' ? 'You' : 'MileZen'}
              </p>
              <p className={styles.chatText}>{m.content}</p>
            </div>
          ))}
          {loading && <p className={styles.chatThinking}>Thinking…</p>}
          {error && <p className={styles.errorText}>{error}</p>}
        </div>

        <form onSubmit={sendMessage} className={styles.chatInputRow}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Which card should I use for dining?"
            className={styles.input}
          />
          <button type="submit" disabled={loading} className={styles.buttonPrimary} style={{ border: 'none' }}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
