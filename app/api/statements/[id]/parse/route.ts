import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractTextLayer, StatementTooLargeError, StatementTooManyPagesError } from '@/lib/statement-parsing/extractText';
import { parseStatementText } from '@/lib/statement-parsing/parsers';

// POST /api/statements/:id/parse
//
// Triggered after a user uploads a statement (call this right after the
// upload completes, or from a queue/cron if you want to batch it later).
//
// Security notes:
//   - Uses the request-scoped Supabase client (RLS-enforced), NOT the
//     service-role client — so a user can only ever trigger parsing for
//     their own statement row. No manual "is this really their statement"
//     check needed; the DB won't return someone else's row at all.
//   - The extracted PDF text is held only in a local variable for the
//     duration of this request. It is never written to a DB column, and
//     is deliberately excluded from every log line below — only counts
//     and parser identifiers are logged, never merchant names/amounts/text.
//   - No LLM call anywhere in this path — pure regex, entirely server-side,
//     nothing sent to any third party.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: statementId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // RLS scopes this to the caller's own row automatically.
  const { data: statement, error: fetchError } = await supabase
    .from('statements')
    .select('id, storage_path, status, user_card_id')
    .eq('id', statementId)
    .single();

  if (fetchError || !statement) {
    // Deliberately generic 404 — don't reveal whether the ID exists but
    // belongs to someone else vs. doesn't exist at all.
    return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
  }

  if (statement.status !== 'pending') {
    return NextResponse.json({ error: `Statement already ${statement.status}` }, { status: 409 });
  }

  try {
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('statements')
      .download(statement.storage_path);

    if (downloadError || !fileBlob) {
      throw new Error('Could not download statement file');
    }

    const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
    const text = await extractTextLayer(fileBuffer);
    const result = parseStatementText(text);

    if (!result.success) {
      await supabase.from('statements').update({ status: 'failed' }).eq('id', statementId);
      console.warn('Statement parse failed', {
        statementId,
        issuerKey: result.issuerKey,
        reason: result.error,
      }); // no statement text or transaction content logged
      return NextResponse.json({ error: result.error ?? 'Could not parse statement' }, { status: 422 });
    }

    // Optional integrity check: if this statement is linked to a specific
    // user_card, make sure the last-4 on the PDF actually matches it —
    // catches the "uploaded the wrong statement" mistake early.
    if (statement.user_card_id && result.detectedLast4) {
      const { data: card } = await supabase
        .from('user_cards')
        .select('last4')
        .eq('id', statement.user_card_id)
        .single();

      if (card && card.last4 !== result.detectedLast4) {
        await supabase.from('statements').update({ status: 'failed' }).eq('id', statementId);
        return NextResponse.json(
          { error: 'Statement last-4 does not match the selected card.' },
          { status: 422 }
        );
      }
    }

    const rowsToInsert = result.transactions.map((t) => ({
      user_id: user.id,
      user_card_id: statement.user_card_id,
      statement_id: statementId,
      txn_date: t.txnDate,
      merchant: t.merchant,
      mcc_code: t.mccCode ?? null,
      amount: t.amount,
    }));

    const { error: insertError } = await supabase.from('transactions').insert(rowsToInsert);
    if (insertError) throw insertError;

    await supabase
      .from('statements')
      .update({ status: 'parsed', parsed_at: new Date().toISOString() })
      .eq('id', statementId);

    return NextResponse.json({
      parsedCount: rowsToInsert.length,
      issuerKey: result.issuerKey,
    });
  } catch (err) {
    await supabase.from('statements').update({ status: 'failed' }).eq('id', statementId);

    if (err instanceof StatementTooLargeError || err instanceof StatementTooManyPagesError) {
      return NextResponse.json({ error: err.message }, { status: 413 });
    }

    console.error('Unexpected statement parse error', { statementId, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to process statement' }, { status: 500 });
  }
  // `text` and `fileBuffer` fall out of scope here and become eligible for
  // garbage collection — nothing extracted from the PDF persists beyond
  // this request except the structured rows we explicitly chose to insert.
}
