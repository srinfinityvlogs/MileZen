import type { ParsedTransaction, ParseResult, StatementParser } from '../types';

// A conservative, bank-agnostic parser. It looks for the most common
// statement line shape:  DATE   MERCHANT NAME   AMOUNT
// e.g. "12/06/2026   AMAZON RETAIL IN        1,249.00"
//
// Regex safety note: every group uses a BOUNDED quantifier (no nested
// unbounded `.*.*` patterns), which avoids catastrophic backtracking
// (ReDoS) even on adversarially crafted statement text.
const LINE_PATTERN =
  /^(\d{2}[/-]\d{2}[/-]\d{4})\s+([A-Za-z0-9 &.,'*_-]{3,45}?)\s+([\d,]{1,12}\.\d{2})\s*(?:Dr|Cr)?$/;

const LAST4_PATTERN = /(?:card|a\/c|account).{0,20}?(?:x{2,}|\*{2,})(\d{4})\b/i;

function toIsoDate(raw: string): string {
  const parts = raw.split(/[/-]/);
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm}-${dd}`;
}

export const genericParser: StatementParser = {
  key: 'generic',

  detect(): boolean {
    // Generic parser is the fallback of last resort — it never "claims" a
    // statement via detect(); the registry falls back to it explicitly.
    return false;
  },

  parse(text: string): ParseResult {
    const lines = text.split('\n');
    const transactions: ParsedTransaction[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 200) continue; // guard against pathological lines
      const match = LINE_PATTERN.exec(trimmed);
      if (!match) continue;

      const [, dateRaw, merchantRaw, amountRaw] = match;
      transactions.push({
        txnDate: toIsoDate(dateRaw),
        merchant: merchantRaw.trim(),
        amount: parseFloat(amountRaw.replace(/,/g, '')),
        rawLine: trimmed,
      });
    }

    const last4Match = LAST4_PATTERN.exec(text);

    return {
      success: transactions.length > 0,
      transactions,
      detectedLast4: last4Match?.[1],
      issuerKey: 'generic',
      error: transactions.length === 0 ? 'No recognizable transaction lines found.' : undefined,
    };
  },
};
