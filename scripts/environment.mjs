// Shared by CLI and server: fail before creating a DB client or mail transport.
export function assertEnvironment(env = process.env) {
  const fail = (key) => { throw new Error(`Unsafe or missing v2 configuration: ${key}`); };
  const mode = env.APP_ENV;
  if (!['local', 'preview', 'production'].includes(mode)) fail('APP_ENV');
  const namespace = `aibildiri_v2_${mode}`;
  if (env.SESSION_COOKIE_NAMESPACE !== namespace) fail('SESSION_COOKIE_NAMESPACE');
  for (const key of ['DRAFT_SESSION_SECRET']) {
    if (!env[key] || env[key].length < 32 || /change-me|replace-with/.test(env[key])) fail(key);
  }
  if (env.FILE_STORAGE !== 'database') fail('FILE_STORAGE');
  let base;
  try { base = new URL(env.APP_BASE_URL); } catch { fail('APP_BASE_URL'); }
  if (base.username || base.password || base.search || base.hash || base.pathname !== '/') fail('APP_BASE_URL');
  const localHosts = new Set(['localhost', '127.0.0.1']);
  if (mode === 'local') {
    if (base.protocol !== 'http:' || !localHosts.has(base.hostname) || base.port !== '3100') fail('APP_BASE_URL');
  } else if (base.protocol !== 'https:' || base.hostname === 'bildiriyonetim.stativera.store' || base.hostname.endsWith('.mcbu.edu.tr') || base.hostname.endsWith('.vercel.app')) {
    fail('APP_BASE_URL: choose a separate v2 domain');
  }
  for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
    let db;
    try { db = new URL(env[key]); } catch { fail(key); }
    if (!['postgresql:', 'postgres:'].includes(db.protocol) || !db.password || db.password.includes('replace-with') || db.search || db.hash) fail(key);
    const name = mode === 'local' ? 'aibildiri_v2' : `aibildiri_v2_${mode}`;
    if (db.pathname !== `/${name}` || db.username !== name) fail(`${key}: dedicated database and user required`);
    if (mode === 'local' && (!localHosts.has(db.hostname) || db.port !== '55432')) fail(`${key}: loopback port 55432 required`);
    if (mode !== 'local' && (!env.V2_DB_HOST || db.hostname !== env.V2_DB_HOST)) fail(`${key}: V2_DB_HOST`);
    if (db.hostname === 'ljoib4ke0c27qo09nkipwxhh' || db.hostname === '178.104.38.35') fail(`${key}: current live database`);
  }
  if (mode !== 'production') {
    if (env.MAIL_MODE !== 'capture') fail('MAIL_MODE: nonproduction requires capture');
    for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'RESEND_API_KEY', 'RESEND_SENDER_EMAIL']) {
      if (env[key]) fail(`${key}: delivery credentials forbidden in nonproduction`);
    }
    const captureDir = mode === 'local' ? '.local/mail' : '/app/.preview/mail';
    if (env.MAIL_CAPTURE_DIR !== captureDir) fail('MAIL_CAPTURE_DIR');
  } else if (env.MAIL_MODE !== 'delivery' || env.EMAIL_DELIVERY_ENABLED !== 'true') fail('explicit production email activation');
  if (mode === 'preview' && (!env.PREVIEW_ACCESS_USER || !env.PREVIEW_ACCESS_PASSWORD || env.PREVIEW_ACCESS_PASSWORD.length < 20 || env.PREVIEW_ACCESS_PASSWORD.includes('replace-with'))) fail('PREVIEW_ACCESS credentials');
  return { mode, namespace, captureDir: env.MAIL_CAPTURE_DIR };
}

export function assertLocal(env = process.env) {
  const config = assertEnvironment(env);
  if (config.mode !== 'local') throw new Error('This operation requires APP_ENV=local');
  return config;
}

export function assertMigrationTarget(env = process.env) {
  const config = assertEnvironment(env);
  // The regular runtime environment must not authorize schema changes. Supply
  // this confirmation only to the separate, explicitly invoked migration job.
  if (config.mode === 'production' && env.V2_PRODUCTION_MIGRATION_CONFIRM !== 'aibildiri_v2_production') {
    throw new Error('Production migrations require V2_PRODUCTION_MIGRATION_CONFIRM=aibildiri_v2_production');
  }
  return config;
}
