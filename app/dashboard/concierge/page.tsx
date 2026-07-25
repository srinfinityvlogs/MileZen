'use client';

import { useState } from 'react';

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
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setError('Could not reach the concierge.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 40, fontFamily: 'system-ui', maxWidth: 600 }}>
      <h1>MileZen concierge</h1>
      <p style={{ color: '#666', fontSize: 14 }}>
        Ask about your balances, which card to swipe, or how to fly somewhere on points.
      </p>

      <div style={{ marginTop: 24, marginBottom: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <strong>{m.role === 'user' ? 'You' : 'MileZen'}:</strong>
            <p style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>{m.content}</p>
          </div>
        ))}
        {loading && <p style={{ color: '#999' }}>Thinking…</p>}
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Which card should I use for dining?"
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit" disabled={loading}>
          Send
        </button>
      </form>
    </main>
  );
}
