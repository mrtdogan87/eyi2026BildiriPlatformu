import { assertEnvironment } from '../scripts/environment.mjs';

// Starting standalone/server.js directly would bypass scripts/run.mjs validation.
// Do this before importing Next or creating a database client.
const config = assertEnvironment();
if (config.mode !== 'production') throw new Error('The production image requires APP_ENV=production');
await import('../server.js');
