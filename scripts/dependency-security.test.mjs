import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import mammoth from 'mammoth';

test('the patched DOCX preview parser preserves normal document text', async () => {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Security regression — Türkçe içerik</w:t></w:r></w:p></w:body></w:document>');
  const result = await mammoth.extractRawText({ buffer: await zip.generateAsync({ type: 'nodebuffer' }) });
  assert.equal(result.value.trim(), 'Security regression — Türkçe içerik');
  assert.deepEqual(result.messages, []);
});

test('the DOCX XML parser bounds malformed end-tag whitespace work', () => {
  // Run the real Mammoth parser in a disposable process so a future vulnerable
  // dependency regression fails within a fixed timeout instead of hanging CI.
  const code = `
    const { parseFromString } = require('mammoth/lib/xml/xmldom');
    try { parseFromString('<root></root' + ' '.repeat(200000) + '!>'); } catch {}
    process.stdout.write('completed');
  `;
  const result = execFileSync(process.execPath, ['--input-type=commonjs', '-e', code], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    timeout: 4000,
    maxBuffer: 2048,
    encoding: 'utf8',
  });
  assert.equal(result, 'completed');
});
