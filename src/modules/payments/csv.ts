import { PaymentError, amountMinor, currencyAllowed, type StatementRow } from './core.ts';
export const statementHeader = ['transaction_id', 'date', 'amount', 'currency', 'description', 'payer_email', 'registration_id'];
export const statementTemplate = statementHeader.join(',') + '\r\n';
// Strict UTF-8, comma-delimited RFC-style CSV. A malformed row aborts the entire
// import; rows are never silently dropped or approved by this parser.
export function parseStatement(content: Uint8Array): StatementRow[] {
  if (!content.byteLength || content.byteLength > 2 * 1024 * 1024) throw new PaymentError(413, 'Ekstre en fazla 2 MB olabilir.');
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(content).replace(/^\uFEFF/, ''); } catch { throw new PaymentError(400, 'Ekstre UTF-8 CSV olmalı.'); }
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)) throw new PaymentError(400, 'Ekstre geçersiz kontrol karakteri içeriyor.');
  const table: string[][] = []; let row: string[] = [], cell = '', quoted = false, afterQuote = false;
  function finishCell() { row.push(cell); cell = ''; afterQuote = false; if (row.length > 7) throw new PaymentError(400, 'Ekstre yedi sütun içermeli.'); }
  function finishRow() { finishCell(); table.push(row); row = []; if (table.length > 501) throw new PaymentError(400, 'Bir ekstre en fazla 500 banka hareketi içerebilir.'); }
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; afterQuote = true; } } else cell += c; }
    else if (c === '"') { if (cell || afterQuote) throw new PaymentError(400, 'Ekstre tırnak biçimi geçersiz.'); quoted = true; }
    else if (c === ',') finishCell();
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; finishRow(); }
    else { if (afterQuote) throw new PaymentError(400, 'Kapanan tırnaktan sonra ayırıcı bekleniyor.'); cell += c; }
    if (cell.length > 2000) throw new PaymentError(400, 'Ekstre hücresi en fazla 2000 karakter olabilir.');
  }
  if (quoted) throw new PaymentError(400, 'Ekstre kapanmamış tırnak içeriyor.');
  if (cell || row.length || afterQuote) finishRow();
  if (JSON.stringify(table.shift()) !== JSON.stringify(statementHeader)) throw new PaymentError(400, 'Sütunlar şablonla aynı sırada olmalı: ' + statementHeader.join(', '));
  if (!table.length) throw new PaymentError(400, 'Ekstre en az bir hareket içermeli.');
  const seen = new Set<string>();
  return table.map((cells, index) => {
    const fail = (message: string): never => { throw new PaymentError(400, `Satır ${index + 2}: ${message}`); };
    if (cells.length !== 7) fail('yedi sütun gerekli.');
    const [reference, date, amount, currency, description, payerEmail, registrationRef] = cells.map(c => c.trim());
    if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(reference)) fail('geçerli ve benzersiz transaction_id gerekli.');
    if (seen.has(reference)) fail('aynı transaction_id dosyada tekrar ediyor.'); seen.add(reference);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(new Date(date).getTime()) || new Date(date).toISOString().slice(0, 10) !== date || date > new Date().toISOString().slice(0, 10)) fail('date geçerli, gelecekte olmayan YYYY-MM-DD tarihi olmalı.');
    if (!currencyAllowed(currency)) fail('currency TRY, EUR veya USD olmalı.');
    if (payerEmail && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail) || payerEmail.length > 254)) fail('payer_email geçersiz.');
    if (registrationRef.length > 128 || description.length > 1500 || /^[=@]/.test(description)) fail('açıklama veya kayıt kimliği geçersiz; formül kullanılmaz.');
    let minor: number; try { minor = amountMinor(amount, true); } catch { return fail('amount pozitif noktalı ondalık olmalı (ör. 1250.50).'); }
    return { reference, occurredAt: date + 'T00:00:00.000Z', amountMinor: minor, currency, description, payerEmail: payerEmail.toLowerCase(), registrationRef, rowNumber: index + 2 };
  });
}
