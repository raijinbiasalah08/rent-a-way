# RentAway - Find Better Ways to Save

A full-stack rental marketplace platform built with React + Node.js.

## Quick Start

### 1. Start the Backend Server
```
cd server
node src/index.js
```
Backend runs at: http://localhost:5000

### 2. Start the Frontend Dev Server
```
cd client
npm run dev
```
Frontend runs at: http://localhost:5173

## Initial Admin Account

The Render deployment's one-time `initialDeployHook` creates the first admin from `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`. Choose a unique password with at least 12 characters when creating the Render Blueprint. After the hook succeeds, remove those two environment variables from Render; the admin account remains in the database.

## Project Structure

```
rent a way 2/
|- client/       React + Vite frontend (port 5173)
|- server/       Node.js + Express backend (port 5000)
|  |- rentaway.db   SQLite database
|  +- uploads/      Product images
+- README.md
```

## Deploy on Vercel and Render

The repository includes `client/vercel.json` for client-side routes and a root `render.yaml` for the API, health check, persistent database/uploads disk, and initial admin bootstrap.

The SQLite database and uploaded files need persistent storage. The Render Blueprint uses a paid 0.5 CPU / 512 MB service and a 1 GB disk; current listed rates are $7/month for the service plus $0.25/GB-month for disk storage. Confirm current pricing in Render before creating the service.

1. Import this GitHub repository into Vercel and set the project root directory to `client`.
2. Deploy once to get the Vercel production URL.
3. Create a Render Blueprint from this repository and provide the prompted environment values:
   - `GOOGLE_CLIENT_ID`: the Google OAuth Web client ID.
   - `CLIENT_ORIGIN` and `FRONTEND_URL`: the Vercel production origin, such as `https://your-project.vercel.app`.
   - `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`: the first admin login.
   - `PAYMONGO_SECRET_KEY`: optional for account browsing; required to enable real PayMongo checkout.
4. After Render deploys, copy its API origin (for example, `https://rentaway-api.onrender.com`) into Vercel as `VITE_API_URL`, then redeploy the frontend.
5. Add the Vercel production origin to the Google OAuth client's Authorized JavaScript origins.
6. Remove `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` from Render after the initial admin bootstrap succeeds.

The production database and uploaded files start empty on the Render persistent disk. The local `server/rentaway.db` and `server/uploads` are not copied to hosting.
