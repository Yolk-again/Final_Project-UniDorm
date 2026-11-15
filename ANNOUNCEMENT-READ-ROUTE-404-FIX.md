# Announcement read route 404 fix

The current frontend sends `PATCH /announcements/:id/read`. The matching controller method already exists in `backend/src/announcement/announcement.controller.ts`, and `AnnouncementModule` is imported by `backend/src/app.module.ts`.

A `Cannot PATCH ...` 404 therefore indicates that the API process on port 3001 is not serving the current compiled backend. Use the included `FIX-ANNOUNCEMENT-READ.ps1` script from the project root. It checks the source route and module registration, stops only a port-3001 process whose command line identifies this project's backend, applies pending migrations, regenerates Prisma Client, rebuilds NestJS, and starts the freshly built API.

Then run `VERIFY-ANNOUNCEMENT-READ-ROUTE.ps1` in a second PowerShell terminal. HTTP 401 or 403 without a token is expected and confirms that NestJS recognizes the route. HTTP 404 means port 3001 is still serving the wrong or stale backend.

No database reset is needed. `migrate deploy` is idempotent for migrations that have already been applied.

The backend e2e suite now includes a regression test asserting that an unauthenticated PATCH to `/announcements/1/read` returns HTTP 401. If the route is absent, the test receives 404 and fails instead.
