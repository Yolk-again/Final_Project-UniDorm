# UniDorm API and frontend setup

## Start the backend

Open PowerShell in the `backend` directory:

```powershell
Copy-Item .env.example .env
npm.cmd ci
npx.cmd prisma generate
npm.cmd run start:dev
```

Set `DATABASE_URL` in `backend/.env` to the PostgreSQL database used by this project. Set a unique `JWT_SECRET` before deployment.

## Start the frontend

Open a second PowerShell window in the `frontend` directory:

```powershell
Copy-Item .env.example .env.local
npm.cmd ci
npm.cmd run dev
```

The frontend reads `BACKEND_API_URL` in `frontend/.env.local`. Locally it defaults to `http://127.0.0.1:3001`.

The browser sends API requests to the same-origin `/api-backend` path. Next.js proxies them to `BACKEND_API_URL`. This avoids exposing a loopback address such as `127.0.0.1` to users of a hosted frontend and avoids browser CORS issues.

For production, set `BACKEND_API_URL` to the backend's public HTTPS URL in the frontend hosting environment, then rebuild and redeploy the frontend. Never use `127.0.0.1` as a production backend URL.

## API checks

- `GET /health`: confirms that the NestJS API process is running. It does not require PostgreSQL.
- `GET /health/ready`: checks whether PostgreSQL is reachable and returns HTTP 503 when it is not.
- Through the frontend proxy, use `/api-backend/health` and `/api-backend/health/ready`.

If `/health` works but `/health/ready` fails, the API is running but its `DATABASE_URL` or PostgreSQL service needs attention.

## Production security

The profile endpoints use signed JWTs. Other existing application controllers still need role-based authorization before the system is ready for real student data or payments. See `SECURITY_AND_DEPLOYMENT.md`.
