import pdf from 'pdf-parse';

// Hard caps to prevent a malicious or corrupt PDF from being used to exhaust
// server resources (a cheap denial-of-service vector on a free-tier serverless
// function with a shared execution budget).
const MAX_FILE_BYTES = 10 * 1024 * 1024;   // 10 MB
const MAX_PAGES = 60;                       // generous for any card statement

export class StatementTooLargeError extends Error {}
export class StatementTooManyPagesError extends Error {}

export async function extractTextLayer(fileBuffer: Buffer): Promise<string> {
  if (fileBuffer.byteLength > MAX_FILE_BYTES) {
    throw new StatementTooLargeError('Statement exceeds the 10 MB size limit.');
  }

  const result = await pdf(fileBuffer, {
    max: MAX_PAGES,
    // Custom pagerender keeps memory bounded and avoids pulling in
    // font/image resources we don't need for pure text extraction.
  });

  if (result.numpages > MAX_PAGES) {
    throw new StatementTooManyPagesError('Statement exceeds the page limit.');
  }

  return result.text;
}
