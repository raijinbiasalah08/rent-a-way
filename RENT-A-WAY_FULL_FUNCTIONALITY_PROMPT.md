# Rent-A-Way Full-Functionality Implementation Prompt

You are a senior full-stack engineer taking ownership of an existing rental marketplace named **Rent-A-Way**. Work directly in the current repository and carry the implementation through to a production-ready result. Do not replace the app with a starter template or rewrite working features without a concrete reason.

## Objective

Make Rent-A-Way fully functional from end to end for customers, suppliers, and administrators, both locally and in the current deployment model:

- Frontend: React 18 + Vite + Tailwind CSS on Vercel
- Backend: Node.js 24 + Express on Render
- Current local database: `node:sqlite`
- Authentication: email/password, JWT, and Google Identity Services
- Realtime features: Socket.IO
- Rentals use a request-and-approval workflow with no online or manual payment processing
- Maps/geocoding: Leaflet and OpenStreetMap/Nominatim
- Current production URLs are configured through environment variables; never hardcode deployment URLs or credentials.

The current deployment must remain on free plans with no billing requirement. Do not add a paid service, paid disk, billing account, or dependency that requires a paid subscription. If a free external service needs the owner to create an account or supply keys, prepare the code, `.env.example`, and exact setup documentation, then clearly identify that manual step.

## How to work

1. Inspect the repository and its current behavior before editing.
2. Preserve the existing Rent-A-Way navy, blue, amber, cream, and white design language. Functional work comes first. Do not implement the separate customer-dashboard redesign mockup unless the user explicitly approves it.
3. Reuse the existing route structure, response envelope, components, and role model where practical.
4. Work in small, reviewable changes. Do not hide errors, silently swallow important failures, or return mock success in production.
5. Never expose secrets, password-reset tokens, service-role keys, or private user data to the browser, logs, commits, or chat.
6. Do not run `npm audit fix --force`. Resolve dependency issues deliberately and verify compatibility.
7. Do not delete existing user work or reset the database. Use explicit migrations and reversible changes.

## Existing conventions to preserve

- API success: `{ "success": true, "data": ... }`
- API error: `{ "success": false, "message": "Human-readable message" }`
- Roles: `admin`, `supplier`, `customer`; keep `renter` only as a backward-compatible frontend alias if needed.
- Backend authorization must use `authenticate` and `authorize(...)` and must also verify resource ownership.
- All SQL must be parameterized.
- All upload endpoints must validate MIME type, extension, and size.
- Frontend API calls should go through `client/src/api/axios.js` and `VITE_API_URL`.
- Keep route guards in `ProtectedRoute`; server authorization remains the source of truth.

## Confirmed problems found in the repository

Treat these as required fixes, then continue auditing for additional problems:

### Production persistence

- Render currently stores SQLite and uploads in `/tmp`. Data, accounts, rentals, messages, reviews, and images can disappear on spin-down, restart, or redeploy.
- Replace ephemeral production storage with free persistent services. Preferred architecture:
  - PostgreSQL on a free managed provider such as Neon for relational data.
  - Cloudinary free tier for product images, avatars, review images, and chat images.
- Keep an easy local development path. Either support SQLite locally through a clean repository/data-access boundary or migrate local development to PostgreSQL with documented setup. Production must never depend on an ephemeral filesystem.
- Add migrations, constraints, indexes, and a one-time migration path for existing SQLite data. Do not rely on scattered `ALTER TABLE` calls at startup as the long-term migration system.

### Authentication and account recovery

- Keep email/password registration, login, JWT sessions, profile editing, password change, and Google sign-in working.
- The forgot-password endpoint currently returns a generated token to the browser and does not persist or email it. Replace it with a real reset flow:
  - Store only a hash of a cryptographically secure, single-use, expiring reset token.
  - Always return a generic response so account existence is not disclosed.
  - Send the reset link through a free email provider such as Resend, with a development-only console adapter.
  - Add a `/reset-password/:token` frontend page and backend consume endpoint.
  - Enforce password strength consistently for registration, admin bootstrap, password change, and reset.
  - Invalidate the token after use and apply rate limiting.
- Add rate limits to login, registration, Google login, forgot password, reset password, messaging, and complaints.
- Validate JWT configuration at startup; reject production startup if `JWT_SECRET` is missing or weak.
- Add `GET /api/auth/user/:id` only if the Messages deep-link flow truly needs it. Return the minimum public profile fields and enforce privacy. The frontend currently calls this missing endpoint.

### Authorization and realtime security

- Socket.IO currently trusts a client-supplied user ID in an `authenticate` event. Replace this with JWT authentication during the Socket.IO handshake. Derive the user ID from the verified token and reject unauthenticated sockets.
- Validate authorization and block status for text, image, equipment-card, location, typing, presence, delivery, and read-receipt events.
- Do not broadcast sensitive presence or account data globally.
- Audit every route for both role and ownership, including rental, product, message, complaint, review, and administration endpoints.
- Prevent admins from accidentally deactivating the last active admin or their own account without an explicit protected workflow.

### Booking and rental integrity

- Consolidate the duplicate booking experiences (`/customer/checkout` and `/customer/booking/:productId`) into one canonical payment-free booking-request flow. Rename or redirect the legacy checkout path so the UI does not imply payment.
- Enforce all critical rules on the server, not only in React:
  - valid ISO dates;
  - start date is today or later;
  - end date is after start date;
  - product is active and available;
  - requested days respect `min_days` and `max_days`;
  - customer cannot rent their own listing;
  - overlapping `pending`, `approved`, or `active` bookings are handled according to one documented policy;
  - price, fees, and refundable deposit are computed from trusted server data, never accepted from the browser;
  - creation and approval use transactions to prevent double booking.
- Define and enforce one rental state machine, for example:
  `pending -> approved|rejected|cancelled -> active -> returned -> completed`.
- Define which role may perform every transition and enforce date and authorization prerequisites.
- Derive overdue state from dates or persist it through a scheduled process; do not show an Overdue filter that can never produce results.
- Update product availability consistently when rentals become active/completed/cancelled.

### Remove payments completely

- Remove PayMongo, GCash, Maya, QR-code, payment-proof, receipt, transaction-reference, and payment-status functionality from the frontend, backend, database, environment configuration, reports, tests, and documentation.
- Remove payment buttons, forms, badges, dashboard cards, tables, filters, routes, API calls, controllers, provider utilities, webhook handlers, upload fields, and navigation entries. Do not leave dead or hidden payment UI.
- Remove payment-specific packages and environment variables after verifying they are unused. Update `.env.example`, Render/Vercel setup, and deployment documentation accordingly.
- Add a migration that safely removes payment-only tables and columns after exporting or archiving any existing records needed for audit/history. Do not silently destroy existing production data.
- Rental prices may remain visible as informational pricing, but Rent-A-Way must not collect, confirm, simulate, or track money. A booking becomes approved only through an authorized supplier/admin rental-state transition, never through payment state.
- Ensure rental approval, activation, return, and completion work independently of payment records or payment status.

### Products, uploads, and search

- Remove the duplicate `GET /api/products/categories` implementation and keep one deterministic response shape.
- Validate pagination and numeric query parameters; cap page size.
- Handle empty/special-character full-text searches safely.
- Validate create/edit fields, price, min/max days, categories, location, and coordinates on the server.
- Ensure suppliers can update/delete only their own products; define explicit admin behavior.
- Do not hard-delete records that are referenced by rentals. Use safe deactivation where appropriate.
- Move all uploaded assets to persistent object storage and clean up replaced/deleted assets.
- Apply the same strict upload validation to products, avatars, reviews, and messages.
- Remove third-party placeholder image dependencies from core flows; provide a local fallback asset.

### Reviews, community, favorites, complaints, and messages

- Allow a review only for a completed rental owned by the customer. Tie the review to a rental and prevent duplicate reviews for the same rental.
- Replace the community `likes = likes + 1` counter with a user-like table and toggle semantics so one account cannot inflate likes indefinitely.
- Validate that favorited products exist and are active; decide whether favorites are customer-only.
- Validate complaint subject/details and reported user; prevent self-reporting and invalid IDs. Keep complaint history and resolution metadata.
- Add the missing public `/community` route or change every Navbar/Footer link to a valid role-aware route. Public visitors should be able to read posts; authenticated users can create/like based on policy.
- Fix message deep links, missing user lookup, image/location validation, block enforcement, unread counts, delivery/read receipts, and reconnect behavior.
- Add pagination to long conversations, notifications, community posts, rentals, products, and admin lists.

### Admin and reporting

- Fix the stats response mismatch: the backend returns camelCase while `Reports.jsx` reads snake_case, causing zero-valued cards.
- Remove revenue and payment metrics from reports. Replace them with useful payment-free marketplace metrics such as active listings, booking requests, approved rentals, completed rentals, cancellation rate, and popular categories.
- Verify user activation, role updates, product moderation, rental oversight, complaints, and reports all call protected admin APIs and show useful success/error states.
- Add audit records for sensitive admin actions.

### Navigation, content, and UX completion

- Fix all links that lead to missing routes or `#`, including Community, Terms of Service, Privacy Policy, and Rental Agreement.
- Create usable legal/support pages or remove links until real destinations exist.
- Ensure every visible button has a working action, loading state, disabled state, success feedback, and error feedback.
- Keep responsive behavior for desktop, tablet, and mobile.
- Add accessible labels, keyboard behavior, focus styles, error summaries, alt text, and sufficient contrast.
- Replace raw console errors and silent catches with intentional user feedback plus structured server logging.
- Keep the existing dashboard visual direction for now. The customer dashboard design mockup is a separate approval decision.

### API quality and validation

- Introduce centralized request validation with a maintained library compatible with Node 24.
- Add centralized async error handling and stable application error codes where useful.
- Do not expose raw database errors or stack traces to clients in production.
- Add security middleware appropriate for Express: secure headers, controlled CORS, body limits, request IDs, and rate limiting.
- Validate required environment variables at startup and add `client/.env.example` and `server/.env.example` without real secrets.
- Document all API endpoints and role/ownership rules.

## Required end-to-end flows

Complete and verify these flows with fresh accounts and persisted production-like data:

1. Customer email registration -> profile/location setup -> login/logout -> password change.
2. Supplier registration -> profile and payout details -> create/edit/deactivate equipment -> upload/reorder/remove images.
3. Google sign-in -> existing-account link or new role selection -> correct dashboard.
4. Forgot password -> email link -> valid reset -> expired/reused token rejection.
5. Browse/search/filter/map -> product details -> date availability -> canonical booking request.
6. Supplier receives request -> approves/rejects -> both users receive realtime and persisted notifications.
7. Supplier-approved booking -> scheduled rental activation -> return -> supplier confirmation -> completion, with no payment step.
8. Completed customer leaves exactly one review for the rental.
9. Customer and supplier message each other with text/image/equipment/location; blocking and reporting work.
10. Community read/create/like works from valid routes.
11. Admin manages users, listings, rentals, complaints, and accurate payment-free reports.
12. Restart/redeploy the backend and confirm users, products, rentals, messages, and uploaded assets remain available.

## Data model and migration expectations

Add proper migrations and constraints for at least:

- password reset tokens;
- Google identities;
- community likes;
- review-to-rental relationship and uniqueness;
- admin audit log;
- complaint resolution metadata;
- useful indexes for email, role, product supplier/category/location, rental participants/status/dates, messages participants/date, notifications user/read/date, and favorites uniqueness.

Preserve existing records during migration. Provide a script that can export the current SQLite data and import it into PostgreSQL with validation and a reconciliation summary.

## Testing and verification

The repository currently lacks meaningful automated tests. Add and run:

- backend unit tests for validators, pricing, state transitions, permissions, and Google token verification boundaries;
- API integration tests with a temporary test database;
- frontend component tests for critical forms and route guards;
- end-to-end tests for the required customer, supplier, admin, reset, and messaging flows;
- production builds for client and server startup checks;
- linting/formatting scripts if absent.

Tests must cover unauthorized access, cross-account ownership attacks, invalid transitions, duplicate requests, overlapping bookings, upload rejection, expired reset tokens, and persistence after restart.

Do not weaken or delete a failing test merely to make the suite green. Fix the underlying behavior.

## Deployment deliverables

- Updated Vercel and Render configuration using free plans only.
- Persistent database and asset-storage adapters with documented free-tier setup.
- Complete environment-variable tables for local, preview, and production.
- Health/readiness endpoints that check application and database connectivity without exposing secrets.
- Safe bootstrap procedure for the first admin that is idempotent and does not retain a permanent plaintext bootstrap password.
- Migration, rollback, backup, and restore instructions.
- A deployment checklist for Google OAuth authorized origins, CORS origins, email sender verification, database migrations, and asset storage.

## Definition of done

The work is complete only when:

- all visible routes and actions work or are intentionally removed;
- all three roles are enforced on both client and server;
- all payment features, dependencies, configuration, routes, UI, and database coupling are removed, while rental lifecycle flows remain functional;
- booking conflicts and invalid state transitions are prevented server-side;
- production data and uploaded assets survive backend sleep, restart, and redeploy;
- Google sign-in works on localhost and the Vercel production origin;
- realtime messaging/notifications authenticate with JWT and recover after reconnect;
- admin statistics and reports match database records;
- automated tests and production builds pass;
- no real credentials or personal data are committed;
- README documentation lets another developer run, migrate, deploy, and verify the system without guessing.

## Final handoff format

At the end, provide:

1. A concise summary of what changed and why.
2. A checklist of completed end-to-end flows.
3. Test/build commands and their results.
4. Migration results and record counts before/after.
5. Deployment/environment steps still requiring the owner’s accounts or secret values.
6. Known limitations, free-tier constraints, and operational risks.
7. Exact files changed, grouped by frontend, backend, database, tests, and deployment.

Do not claim the app is fully functional based only on a successful build. Demonstrate the required flows and report evidence.
