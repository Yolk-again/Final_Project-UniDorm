# UniDorm account and deployment setup

## Local development

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `DATABASE_URL` to your PostgreSQL connection string.
3. Keep the development `JWT_SECRET` only for local work. Use a new long random secret for any deployed environment.
4. Copy `frontend/.env.example` to `frontend/.env.local`.
5. Keep `NEXT_PUBLIC_API_URL=http://localhost:3001` when the API runs locally.
6. Start the backend from `backend` and the frontend from `frontend`.

## Deployment

Set these backend environment variables in the hosting provider:

- `DATABASE_URL`: production PostgreSQL connection string.
- `JWT_SECRET`: a unique, long random secret. The backend refuses to start in production when this is missing.
- `FRONTEND_URL`: the exact deployed frontend origin, including `https://`.
- `FRONTEND_URLS`: optional comma-separated additional frontend origins, such as preview domains.
- `PORT`: supplied by many hosting providers; the backend uses it when present.

Set this frontend environment variable in the frontend hosting environment:

- `BACKEND_API_URL`: the deployed backend's public HTTPS URL, with no trailing slash.

The browser sends requests to the same-origin `/api-backend` path, and the Next.js rewrite proxies them to `BACKEND_API_URL`. Never configure `127.0.0.1` or `localhost` as the backend URL for a hosted frontend; those addresses point to each visitor's own device. Rebuild and redeploy the frontend after changing `BACKEND_API_URL`, because the rewrite destination is read by the Next.js server configuration.

## Account and session behaviour

- Both student and admin logins receive a signed bearer token that expires after eight hours.
- The profile API requires that token. A user can update their name and email; students can also update gender and either role can change their password.
- Student ID, admin ID, account role, and account ownership are controlled by the backend and cannot be changed through the profile endpoint.
- The API returns public profile fields only; password hashes are never sent to the browser.

## Important production limitation

The current application has several older room, booking, chat, announcement, and payment endpoints that are not yet protected by role-based authorization. The profile endpoints are authenticated, but this does not yet make the entire application production-secure. Complete the authorization and audit-log work in the recommended next steps before using real student records or payments.
