# Kongre production deployment

This stack is exclusively for `https://kongre.stativera.store`. It has its own
PostgreSQL 16 database/user (`aibildiri_v2_production`) and named volume. Do not
attach the existing EYI database, mount its storage, or change its domain.

## Runtime configuration

Use `production.env.example` to prepare protected runtime variables. The DB
password must be URI-safe, preferably fresh random hexadecimal text, because
Compose constructs both connection URLs from it. Do not save real values in
Git, build arguments, a Docker image or a command history. A private env file
passed using `--env-file` is for Compose interpolation and is not mounted into
any container. `.dockerignore` excludes env files, backup files, local state
and the Mac's `node_modules` from the build context.

Node 24 and native npm/Prisma modules are installed inside Linux containers on
the deployment architecture. The app includes bundled PDF fonts and templates.
Image creation uses dummy preview settings and does not connect to PostgreSQL,
run migrations, seed data, or send mail. The standalone web entry point validates
the production environment before loading the server.

The supplied mail defaults use port 587 with STARTTLS (`SMTP_SECURE=false`),
matching the previous handover's reported working transport. Verify the current
provider and egress configuration before sending live mail.

The two workers run independently of the web app. Successful batches update
their heartbeat files; DB or batch failures do not. The mail healthcheck allows
15 minutes for a batch of up to 20 provider calls, while the CMS check allows
2 minutes. Container health is a monitoring signal: Docker Compose's restart
policy restarts exited processes, but does not by itself restart an unhealthy
process. Investigate persistent unhealthy status.

## Coolify

Create a separate Git application using Docker Compose. The local `v2` folder
is an independent Git repository: use `/` as the repository base directory and
`/deploy/compose.production.yml` as the Compose file location in Coolify. Do not
set the base directory to `/v2`. Set runtime variables on this resource only. Route the `app`
service to `https://kongre.stativera.store:3000`; the internal port is part of
Coolify's routing configuration, and public users visit the standard HTTPS URL.
Leave DB and worker domains empty. No host port mappings are required.

Check the generated/deployable Compose before deployment: keep migration and
bootstrap profiles disabled for routine deployments, preserve the separate
volume and private DB hostname, and ensure the proxy targets only `app`.
Coolify may normalize resource-specific network and volume names. Do not enable
a shared/predefined network for accessing the old EYI resources.

Official references: [Compose builds](https://coolify.io/docs/applications/builds/docker-compose),
[domains](https://coolify.io/docs/applications/configuration/domains), and
[Compose networking](https://coolify.io/docs/services/configuration/networking).

## Prebuilt images without a registry

Build the web (`runner`) and worker/job (`tools`) targets on a capable Linux
builder for the server's architecture. Transfer the resulting `docker save`
archive through an authenticated channel, verify its checksum, then `docker load`
it into the same Docker daemon that Coolify uses. Record and compare both image
IDs and architecture before starting services. A versioned tag is a chosen
reference, not proof that an image is immutable; keep the original archive for
rollback and for restoring a replacement host.

Generate the image-only Compose from this checkout's production source:

```sh
node scripts/generate-prebuilt-compose.mjs \
  --web-image stativera/kongre-web:prod-d068a47cd90f-arm64 \
  --tools-image stativera/kongre-tools:prod-d068a47cd90f-arm64
node --test scripts/prebuilt-compose.test.mjs
```

The refs above identify this release; supply the refs actually built for each
future release. Both arguments are required. The generator writes
`.local/compose.production.prebuilt.yml` with 0600 permissions, removes all build
blocks, and sets `pull_policy: never` on the web, workers and one-off jobs. It does
not read environment files or resolve runtime placeholders. The source Compose,
dedicated DB/volume, profiles, job confirmations and healthchecks are preserved.
The official PostgreSQL image retains its original image/pull behavior.

For a new Coolify **Docker Compose Empty** service, paste the generated YAML and
configure only this resource's runtime variables and `app` domain. Inspect its
deployable Compose before starting it. In Coolify `v4.0.0-beta.470`, the
[service parser](https://github.com/coollabsio/coolify/blob/v4.0.0-beta.470/bootstrap/helpers/parsers.php#L2492)
retains service fields including profiles and pull policy, and excludes
`restart: 'no'` jobs from status. It also injects the resource's `.env` into every
service. Keep migration/bootstrap confirmation values out of persistent Coolify
variables; supply them only to the explicit one-off command.

The beta.470
[UI start action](https://github.com/coollabsio/coolify/blob/v4.0.0-beta.470/app/Livewire/Project/Service/Heading.php)
requests a pull on normal Deploy; Restart omits that request. Its
[service start action](https://github.com/coollabsio/coolify/blob/v4.0.0-beta.470/app/Actions/Service/StartService.php)
runs plain `docker compose pull` and adds `--build` to `up` (there are no builds
left). The server's verified Compose `5.1.1`
[skips services with pull policy never](https://github.com/docker/compose/blob/v5.1.1/pkg/compose/pull.go#L73),
including explicit pull commands. The
[CLI overrides this policy only when --policy is supplied](https://github.com/docker/compose/blob/v5.1.1/cmd/compose/pull.go),
which this Coolify action does not do. Confirm that all five application/job
services retain `pull_policy: never` in the deployable Compose; PostgreSQL can
still be pulled. Recheck these behaviors after a Coolify/Compose upgrade.

For direct Compose commands below, replace `-f deploy/compose.production.yml`
with `-f .local/compose.production.prebuilt.yml` and omit the build command.
When Coolify manages the stack, execute one-off jobs against its generated
Compose, protected env and project name; using a second project name would
create another DB volume. Start only the new DB until migration/bootstrap finish.
Never substitute the old EYI resource's Compose, environment, network or volume.

## Explicit first-deployment sequence

Run from the root of the dedicated deployment checkout (the local `v2` folder). Replace `/secure/kongre.env`
with the actual protected runtime file. For an existing database, take and
verify a current backup before applying migrations. Keep the web/worker services
stopped until the first migration and bootstrap succeed.

```sh
docker compose --env-file /secure/kongre.env -f deploy/compose.production.yml build app mail-worker cms-worker migrate bootstrap
docker compose --env-file /secure/kongre.env -f deploy/compose.production.yml up -d db-v2-production
docker compose --env-file /secure/kongre.env -f deploy/compose.production.yml --profile migration run --rm -e V2_PRODUCTION_MIGRATION_CONFIRM=aibildiri_v2_production migrate
docker compose --env-file /secure/kongre.env -f deploy/compose.production.yml --profile bootstrap run --rm -T -e V2_BOOTSTRAP_CONFIRM=aibildiri_v2_production bootstrap < /secure/production-admin.json
docker compose --env-file /secure/kongre.env -f deploy/compose.production.yml up -d app mail-worker cms-worker
docker compose --env-file /secure/kongre.env -f deploy/compose.production.yml ps
```

Bootstrap reads `{ "name": "…", "email": "…", "passwordHash": "…" }` from stdin.
It is an explicit one-off operation using the existing account's protected
export. The confirmation flags are absent from normal runtime services and the
example env file. Never run a seed script against production.

On the source Mac, `npm run production:export-admin` reads the single active
local platform administrator and writes `.local/production-admin.json` with
0600 permissions, without changing the local database. If the local login uses
a synthetic `.invalid` address, first save the owner's confirmed real name and
email as a private JSON file with only `name` and `email`, then run
`npm run production:export-admin -- --identity .local/production-identity.json`.
This changes only the exported identity; the existing password hash is retained.
Transfer the export through an authenticated private channel. Do not put it in
Git, an image, a build log or a public directory. Bootstrap refuses to run over
existing application accounts/data and does not send any email.

The web healthcheck requires `/api/health` to return `200` and `status: ok`,
including a successful DB query. After deployment, separately verify HTTPS,
account login and representative workflows; also recheck the unchanged EYI URL.
Retain the previous application image and a matching DB backup for rollback.
Do not run `down -v` on this or the existing EYI stack.

## Local static verification

```sh
node --test scripts/production-container.test.mjs
npm run test:production
# Requires local PostgreSQL 16 executables; creates and removes its own cluster.
npm run test:production-database
```

These checks do not build an image, start a database, test ARM64 native modules
or prove a deployment successful. A real Docker build and isolated production
smoke checks must be recorded separately on the deployment host.

The handover records a prior webpack out-of-memory failure on the 4 GB server.
The application's `run.mjs build` still uses webpack. Select and verify builder
capacity before running a Docker build on the host that also serves existing
sites; a separate ARM64 builder or a compatible build host may be needed. Local
isolated Next.js checks do not prove the Linux ARM64 image builds successfully.
