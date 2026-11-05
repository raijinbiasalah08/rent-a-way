# Rent-A-Way deployment and verification

The application now uses bookings without payment processing. Rental prices are estimates. Approval, handover, return, and completion are recorded by the participants. Existing financial records are preserved in inactive `legacy_*_archive` tables during migration; there are no payment endpoints or screens.

## Local development

Use Node 24. Run `npm ci` in both `server` and `client`. Copy each `.env.example` to `.env`. Generate a random JWT secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and store it in `server/.env`. Never commit it.

Run `npm run dev` in each directory. SQLite and local uploads are for development only. Reset emails without a Resend key are written to the ignored `server/.local-mail` directory. This adapter is disabled in production. Open the link in the local outbox to test a reset; the API never returns a reset token.

Bootstrap an admin using `INITIAL_ADMIN_EMAIL` and a unique `INITIAL_ADMIN_PASSWORD` of 12–72 characters, then run `npm run bootstrap` in `server`. Remove the bootstrap password after the first successful deployment. Existing admins make subsequent bootstrap runs a no-op. Public registration cannot create administrators.

## Free deployment configuration

Keep the Vercel Hobby project and the Render **Free** web service. Do not select a paid instance or attach a paid disk. Create free accounts for persistent PostgreSQL (for example Neon), Cloudinary image storage, and Resend email. These integrations still require your account credentials. Check each provider's current free limits and stop rather than enabling billing if the free allowance is insufficient.

Render's filesystem is ephemeral, so the application intentionally refuses to use SQLite in production. See [Render free service limitations](https://render.com/docs/free). PostgreSQL data and Cloudinary images are external to the sleeping backend. Free instances still have cold starts and are not an uptime guarantee.

Set these **server-only** variables in Render:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Persistent PostgreSQL connection string with TLS enabled; obtain it from the provider's connection dialog |
| `CLOUDINARY_URL` | Secret Cloudinary connection URL; never expose it in Vite variables |
| `JWT_SECRET` | Random secret, at least 32 characters |
| `JWT_EXPIRES_IN` | `7d` or your preferred shorter expiry |
| `CLIENT_ORIGIN` | Exact Vercel origin, e.g. `https://rent-a-way.vercel.app`; comma-separated explicit origins only |
| `FRONTEND_URL` | Canonical frontend origin used in reset links |
| `GOOGLE_CLIENT_ID` | Your Google web OAuth client ID |
| `RESEND_API_KEY` | Email provider API key |
| `MAIL_FROM` | Sender address on a domain verified with Resend |
| `INITIAL_ADMIN_EMAIL` | First admin's email, needed only when no active admin exists |
| `INITIAL_ADMIN_PASSWORD` | First admin password; remove after bootstrap |

In Vercel set public **Config** variable `VITE_API_URL` to the backend origin (without `/api`), e.g. `https://rentaway-api.onrender.com`. Root directory: `client`; build command: `npm run build`; output: `dist`. Redeploy after changing build-time variables. Never put database, JWT, email, or Cloudinary secrets in a `VITE_` variable.

Google Cloud Console → Google Auth Platform → Clients → your web client → Authorized JavaScript origins: add the exact Vercel origin plus the local origins you use. The production and preview domains are different origins. Use the canonical production domain for testing. Browser origin rejection happens at Google and requires this console configuration; app code cannot bypass it. The server verifies Google ID-token signatures, audience, issuer, expiry and verified email.

Provider references: [Neon connections](https://neon.com/docs/connect/connect-from-any-app), [Cloudinary Node uploads](https://cloudinary.com/documentation/node_image_and_video_upload), [Resend email API](https://resend.com/docs/api-reference/emails/send-email).

## Data migration and rollback

Back up the SQLite file and its uploaded assets before changing an existing installation. Stop writes during export. From `server`, use `node src/db/transfer.js export PATH_TO_SOURCE_DB PATH_TO_BACKUP_JSON`. The source opens read-only, the output refuses overwrite, and the console prints record counts only. The JSON contains personal data and password hashes: store it privately outside Git.

For the previously chosen fresh production start, use an empty PostgreSQL database and bootstrap the new admin. To transfer records instead, set the destination `DATABASE_URL`, then run `node src/db/transfer.js import PATH_TO_BACKUP_JSON`. Import refuses any nonempty destination and runs in a transaction, comparing counts before commit. Unsupported financial fields remain in the source backup; the active schema does not import them.

Local `/uploads/...` references require moving their corresponding original files to Cloudinary before switching an existing dataset to production. New uploads go directly to Cloudinary. Do not delete the original asset backup until every migrated URL has been checked.

Migration version 1 creates the schema, adds indexes and new fields, and archives obsolete financial data transactionally. Repeating initialization preserves rows. For rollback, stop application writes, restore the pre-change database and assets into a separate target, and redeploy the matching previous application revision. Do not point the old payment-enabled application at the new schema. PostgreSQL backups/restores can use the provider's export tools or `pg_dump`/`pg_restore`; verify restoration into an empty test database before relying on a backup.

Migration version 2 adds the upload registry, image ordering, and catalog indexes. Failed object-storage deletions keep their registry entry and emit a sanitized error for retry; no legacy files are deleted automatically. `node test/local-migration.cjs PATH_TO_SOURCE_DB` validates the upgrade on a temporary, consistent SQLite backup and removes the copy afterward. It opens the original read-only and prints counts only.

## Verification

- `cd server` then `npm test`: isolated SQLite API/security/migration checks. Test data is created in an OS temporary directory.
- PostgreSQL dialect verification: set `TEST_POSTGRES=1` and run `npm test`. In PowerShell: `$env:TEST_POSTGRES='1'; npm test`. This uses embedded PostgreSQL, not the production database or network pool.
- `node test/browser.cjs`: headless Chrome checks against isolated backend/frontend servers, including role pages, the rental lifecycle, message deep links, password reset and mobile routes. Set `BROWSER_CHANNEL=msedge` to use installed Edge. Install client dependencies and the selected browser first. Port 5179 must be free. The test waits one minute between batches to respect the real rate limiter.
- `cd client` then `npm run build`: production bundle and PWA generation.
- `cd client` then `npm run lint`: undefined-variable, unreachable-code, and duplicate-key checks.
- `/health` is process liveness; `/ready` also checks database connectivity.

Before public launch, verify a real Google login on the production origin, email delivery to an allowed recipient, Cloudinary uploads, and records surviving a Render restart. These require configured external accounts and cannot be demonstrated with local test fixtures. Do not treat a successful build as proof that those services are configured.

Production startup validates the persistent storage, email, Google and HTTPS frontend settings. Configure them before deploying this revision: the old temporary SQLite setup is intentionally rejected. Resend requires a verified sender domain for general delivery; if you do not already control one, resolve that setup without enabling a paid purchase. The free service is quota-limited ([Resend limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits)); Neon also offers a quota-limited [Free plan](https://neon.com/docs/introduction/plans). No billing account or paid resource was created by this implementation.

Booking policy: pending requests reserve the requested interval. Intervals are start-inclusive and end-exclusive, with duration in days. Overlapping pending/approved/active/returned records block another booking; cancellation/rejection releases the interval. The supplier confirms handover within the reserved dates. Customers mark active rentals returned, then suppliers verify completion. The server derives overdue flags using the Asia/Manila calendar. Product availability remains a supplier-controlled listing flag; date availability is computed from reservations.
