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

The Render start command creates the initial admin from `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` whenever the database is empty. Keep both values set in Render and use a unique password with at least 12 characters. On the free plan, the database can be erased when the service spins down or restarts, so this restores the admin but not other app data.

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

The repository includes `client/vercel.json` for client-side routes and a root `render.yaml` for the API, health check, and admin bootstrap.

The Render Blueprint uses the Free web service plan and no paid disk. This keeps the hosted services at $0 within free usage limits, but is suitable for demos only: Render can spin the service down after 15 minutes without traffic, startup can take about a minute, and local SQLite data and uploaded images are erased whenever the service spins down, restarts, or redeploys. Keep a copy of anything important outside the service.

1. Import this GitHub repository into Vercel and set the project root directory to `client`.
2. Deploy once to get the Vercel production URL.
3. Create a Render Blueprint from this repository and provide the prompted environment values:
   - `GOOGLE_CLIENT_ID`: the Google OAuth Web client ID.
   - `CLIENT_ORIGIN` and `FRONTEND_URL`: the Vercel production origin, such as `https://your-project.vercel.app`.
   - `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`: the first admin login.
   - `PAYMONGO_SECRET_KEY`: optional for account browsing; required to enable real PayMongo checkout.
4. After Render deploys, copy its API origin (for example, `https://rentaway-api.onrender.com`) into Vercel as `VITE_API_URL`, then redeploy the frontend.
5. Add the Vercel production origin to the Google OAuth client's Authorized JavaScript origins.
6. Keep `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` set in Render so the admin can be recreated after a free-tier filesystem reset.

The hosted database and uploads start empty. The local `server/rentaway.db` and `server/uploads` are not copied to hosting. Render Free can suspend service activity if workspace free usage limits are exceeded; avoid adding paid resources or a payment method if you need to prevent overage charges.
