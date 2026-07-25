// Shared types for statement parsing. Keeping these explicit makes it easy
// to add a new bank's parser without touching the ingestion route.

export interface ParsedTransaction {
  txnDate: string;       // ISO date 'YYYY-MM-DD'
  merchant: string;
  amount: number;        // always positive; sign/direction inferred separately if needed
  mccCode?: string;
  rawLine: string;       // original line, kept ONLY in memory for debugging this request —
                          // never persisted to the DB or logs (see route handler)
}

export interface ParseResult {
  success: boolean;
  transactions: ParsedTransaction[];
  detectedLast4?: string;      // last 4 digits found on the statement, for cross-check
  issuerKey?: string;          // which parser matched, e.g. 'hdfc', 'amex'
  error?: string;
}

// A parser just needs to answer "does this text look like mine?" and,
// if so, produce transactions from it.
export interface StatementParser {
  key: string;
  /** Cheap heuristic check — look for a bank's known header/footer strings. */
  detect(text: string): boolean;
  /** Do the actual line-by-line extraction. */
  parse(text: string): ParseResult;
}
