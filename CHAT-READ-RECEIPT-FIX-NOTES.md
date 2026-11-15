# UniDorm chat read-receipt fix

- Confirmed that the frontend PATCH URL and NestJS controller route match.
- Confirmed `ChatModule` is imported in `AppModule`.
- Added a guarded rebuild/restart helper to avoid continuing to use a stale compiled backend process.
- Added an HTTP status verification helper: 401/403 without a token means the route is registered; 404 means the wrong or stale backend is still running.
- Preserved student-style admin navigation and the persistent database-backed admin read timestamp.
