import type { ParseResult, StatementParser } from '../types';
import { hdfcParser } from './hdfc';
import { genericParser } from './generic';

// Add each new issuer parser here as you build it.
const ISSUER_PARSERS: StatementParser[] = [hdfcParser];

export function parseStatementText(text: string): ParseResult {
  for (const parser of ISSUER_PARSERS) {
    if (parser.detect(text)) {
      const result = parser.parse(text);
      if (result.success) return result;
      // detected the bank but extraction still failed — don't silently
      // fall through to generic, since generic's assumptions may be wrong
      // for this bank's layout. Surface it for manual review instead.
      return result;
    }
  }

  // No issuer-specific parser matched — try the generic pattern as a
  // best-effort fallback (per your choice: regex-only, no LLM fallback).
  return genericParser.parse(text);
}
