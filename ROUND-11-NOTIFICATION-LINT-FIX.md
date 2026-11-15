# UniDorm Round 11 — Notification Center lint fix

## Changes

- Refactored the initial and periodic notification refresh to apply state updates in asynchronous Promise callbacks after the API request resolves.
- Added an effect cleanup guard to ignore responses after the Notification Center unmounts.
- Preserved the 30-second refresh interval and the manual refresh performed when the bell is opened.
- Escaped the apostrophe in the empty-state message for the JSX lint rule.
- No API contract, database schema, migration, or notification behavior was changed.

## Validation

The two ESLint errors reported in `frontend/app/components/NotificationCenter.tsx` were addressed. Run `npm run lint` and `npm run build` locally to verify against the installed dependency set. Four existing lint warnings in other files are outside this focused fix.
