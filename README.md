# Rent-A-Way

Rental equipment marketplace for Roxas, Oriental Mindoro, with customer, supplier, and administrator workspaces. React/Vite frontend, Express/Socket.IO backend, PostgreSQL in production, and SQLite for local development.

Bookings use supplier approval, handover, return, and completion. There is no payment processing. Displayed rental prices are informational estimates.

## Run locally

Use Node 24. Run `npm ci` in `server` and `client`. Copy `.env.example` to `.env` in each directory and set a random `JWT_SECRET` of at least 32 characters in the server environment.

Run `npm run dev` in `server` for the API on port 5000 and in `client` for the frontend on port 5173. Local data is stored in `server/rentaway.db`; uploads are under `server/uploads`. No sample data is inserted automatically.

Create the first admin by setting `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` (12–72 characters), then running `npm run bootstrap` in `server`. Remove the bootstrap password after creation. Admin bootstrap is idempotent and does not overwrite an existing account.

## Verify

- In `server`: `npm test` runs isolated API, security, and migration checks.
- Set `TEST_POSTGRES=1` and run `node --test test/flows.test.js` for the PostgreSQL dialect checks.
- In `server`: `node test/browser.cjs` runs headless Chrome checks with temporary data. Install client dependencies and Chrome first; port 5179 must be free.
- In `client`: `npm run build` creates the production bundle.

## Deployment

Use the Vercel frontend and Render Free backend. Production requires persistent PostgreSQL, Cloudinary images, and Resend email credentials. The server refuses ephemeral SQLite in production. The Render configuration uses no paid disk or paid instance.

Read [DEPLOYMENT.md](DEPLOYMENT.md) for exact environment variables, Google OAuth origins, migrations, backups, rollback, free-service constraints, and required external-service verification. Read [API.md](API.md) for route and authorization rules.

Existing financial records are archived by migration rather than silently deleted. Keep a database and upload backup before updating an existing installation. Do not deploy until the required external credentials are configured.
