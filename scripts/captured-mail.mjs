import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// The durable worker runs independently from the HTTP request. Observe its
// capture output without assuming request completion also means delivery.
export async function waitForCapturedMail(to, { subject = '', predicate = () => true, timeoutMs = 20000 } = {}) {
  const directory = resolve(process.env.V2_LOCAL_ROOT ?? process.cwd(), '.local/mail');
  const deadline = Date.now() + timeoutMs;
  do {
    let files = [];
    try { files = readdirSync(directory).filter(file => file.endsWith('.json')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const matches = [];
    for (const file of files) {
      let mail;
      try { mail = JSON.parse(readFileSync(resolve(directory, file), 'utf8')); }
      catch (error) { if (error.code === 'ENOENT' || error instanceof SyntaxError) continue; throw error; }
      if (mail.to === to && mail.subject.toLocaleLowerCase('tr').includes(subject.toLocaleLowerCase('tr')) && predicate(mail)) matches.push(mail);
    }
    matches.sort((a, b) => String(b.capturedAt ?? '').localeCompare(String(a.capturedAt ?? '')));
    if (matches[0]) return matches[0];
    await delay(75);
  } while (Date.now() < deadline);
  throw new Error('Expected local email capture did not appear before timeout; check the queue worker.');
}
