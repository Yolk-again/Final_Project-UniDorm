# UniDorm localhost connection fix

This update addresses the common causes of `TypeError: Failed to fetch` during login:

1. The NestJS backend now loads `backend/.env` through Nest ConfigModule before Prisma and authentication services initialize.
2. JWT configuration is initialized through `ConfigService`, after environment loading.
3. Local development CORS accepts `localhost`, `127.0.0.1`, and IPv6 loopback origins. Production still uses the explicit `FRONTEND_URL` allowlist.
4. Frontend local API requests prefer `http://127.0.0.1:3001`, avoiding Windows localhost/IPv6 resolution inconsistencies. Safe reads and login can retry the alternate loopback hostname if necessary.
5. API responses that are HTML pages (commonly the wrong Next.js process on the API port) are detected rather than being passed to JSON parsing.
6. `GET /health` provides a public connectivity check independent of login credentials.

The expected local ports are frontend `3000` and backend `3001`. Ensure no old Next.js process is occupying port `3001`.

After extracting the project, preserve your own `backend/.env` and `frontend/.env.local`, restart both servers, and verify:

- `http://127.0.0.1:3001/health` returns JSON with `status: "ok"`.
- `http://127.0.0.1:3000` loads the frontend.

Run `CHECK-UNIDORM-CONNECTION.ps1` from the project root to check both services. See `POWERSHELL_TESTING.md` for installation, build, lint, and test commands. No database reset or migration reset is required for this connection fix.
