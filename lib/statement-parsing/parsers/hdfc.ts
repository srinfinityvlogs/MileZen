import type { ParsedTransaction, ParseResult, StatementParser } from '../types';

// Issuer-specific parsers exist because every bank formats statements
// differently. This one is a worked example for HDFC-style statements —
// duplicate this file per issuer (amex.ts, icici.ts, ...) as you add
// support. Keep detect() cheap (string includes, not regex) since it runs
// against every parser on every statement.
//
// HDFC-style line example:
//   15/06/2026  SWIGGY BANGALORE            450.00 IN 5812
// (date, merchant, amount, direction flag, MCC)
const HDFC_LINE_PATTERN =
  /^(\d{2}\/\d{2}\/\d{4})\s+([A-Za-z0-9 &.,'*_-]{3,40}?)\s+([\d,]{1,12}\.\d{2})\s+(IN|CR)\s+(\d{4})$/;

export const hdfcParser: StatementParser = {
  key: 'hdfc',

  detect(text: string): boolean {
    return text.includes('HDFC Bank') && text.includes('Statement of Account');
  },

  parse(text: string): ParseResult {
    const lines = text.split('\n');
    const transactions: ParsedTransaction[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 200) continue;
      const match = HDFC_LINE_PATTERN.exec(trimmed);
      if (!match) continue;

      const [, dateRaw, merchantRaw, amountRaw, , mccCode] = match;
      const [dd, mm, yyyy] = dateRaw.split('/');

      transactions.push({
        txnDate: `${yyyy}-${mm}-${dd}`,
        merchant: merchantRaw.trim(),
        amount: parseFloat(amountRaw.replace(/,/g, '')),
        mccCode,
        rawLine: trimmed,
      });
    }

    const last4Match = /Card No\..{0,10}?(\d{4})\s*$/m.exec(text);

    return {
      success: transactions.length > 0,
      transactions,
      detectedLast4: last4Match?.[1],
      issuerKey: 'hdfc',
      error: transactions.length === 0 ? 'HDFC format detected but no transactions matched.' : undefined,
    };
  },
};
