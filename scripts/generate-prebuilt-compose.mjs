import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
// Build-time tooling only; no runtime configuration or dotenv is loaded here.
const { load, dump } = require('js-yaml');
const root = fileURLToPath(new URL('../', import.meta.url));
const imageServices = ['app', 'mail-worker', 'cms-worker', 'migrate', 'bootstrap'];

function validateImage(reference, option) {
  // Require a literal tagged reference or digest, never Compose interpolation.
  const repository = '(?:[a-z0-9]+(?:[._-][a-z0-9]+)*(?::[0-9]+)?/)*[a-z0-9]+(?:[._-][a-z0-9]+)*';
  const version = '(?::[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}|@sha256:[a-f0-9]{64})';
  if (typeof reference !== 'string' || !new RegExp(`^${repository}${version}$`).test(reference) || reference.endsWith(':latest')) {
    throw new Error(`${option} requires an explicit versioned image tag or sha256 digest (not latest).`);
  }
  return reference;
}

export function parseOptions(args) {
  const options = {};
  const names = { '--web-image': 'webImage', '--tools-image': 'toolsImage' };
  for (let index = 0; index < args.length; index += 2) {
    const name = names[args[index]];
    if (!name || options[name] !== undefined || !args[index + 1]) {
      throw new Error('Usage: node scripts/generate-prebuilt-compose.mjs --web-image REF --tools-image REF');
    }
    options[name] = validateImage(args[index + 1], args[index]);
  }
  for (const [flag, name] of Object.entries(names)) validateImage(options[name], flag);
  return options;
}

function assertNoBuild(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'build') throw new Error('Unexpected build block remains; review the production Compose changes.');
    assertNoBuild(child);
  }
}

export function generatePrebuiltCompose(source, { webImage, toolsImage }) {
  validateImage(webImage, '--web-image');
  validateImage(toolsImage, '--tools-image');
  const compose = load(source);
  for (const name of imageServices) {
    const service = compose?.services?.[name];
    if (!service?.build) throw new Error(`Missing expected production build service: ${name}`);
    delete service.build;
    service.image = name === 'app' ? webImage : toolsImage;
    service.pull_policy = 'never';
  }
  delete compose['x-tools-build'];
  assertNoBuild(compose);
  return '# Generated from deploy/compose.production.yml; runtime variables are deliberately unresolved.\n'
    + dump(compose, { noRefs: true, lineWidth: -1 });
}

export function writePrebuiltCompose(repositoryRoot, options) {
  const source = readFileSync(resolve(repositoryRoot, 'deploy/compose.production.yml'), 'utf8');
  const generated = generatePrebuiltCompose(source, options);
  const output = resolve(repositoryRoot, '.local/compose.production.prebuilt.yml');
  mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
  const temporary = `${output}.${process.pid}.tmp`;
  try {
    writeFileSync(temporary, generated, { flag: 'wx', mode: 0o600 });
    renameSync(temporary, output);
  } finally {
    rmSync(temporary, { force: true });
  }
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const output = writePrebuiltCompose(root, parseOptions(process.argv.slice(2)));
    console.log(`Wrote ${output}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
