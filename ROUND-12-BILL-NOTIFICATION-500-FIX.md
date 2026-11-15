# UniDorm Round 12 — Student bill notification 500 fix

## Confirmed cause

The frontend queries `GET /notifications/unread-count/BILL_CREATED`. The endpoint exists in the backend source and queries the Prisma `Notification` table. That table is created by migration `20261115100000_add_in_app_notifications`.

The earlier helper script incorrectly treated the non-zero exit code from `prisma migrate status` as proof of a failed migration. Prisma can report a pending migration with a non-zero status while explicitly listing it under “have not yet been applied”. The script stopped before `prisma migrate deploy`, leaving the Notification table absent and causing the API query to return HTTP 500.

## Fix

Run `FIX-BILL-NOTIFICATION-500.ps1` from the project root. It:

1. Stops existing UniDorm backend Node processes.
2. Validates the Prisma schema.
3. Reads the migration status output and distinguishes pending migrations from explicitly failed migrations.
4. Applies pending migrations with `prisma migrate deploy`.
5. Verifies the migration status after deployment.
6. Regenerates Prisma Client.
7. Builds the backend and runs unit and e2e tests.
8. Starts the production backend.

The script never runs `prisma migrate reset`, never marks a migration resolved automatically, and stops if Prisma explicitly reports a failed migration or deployment fails.

## Verify

In a second PowerShell window, run `VERIFY-BILL-NOTIFICATION-ROUTE.ps1`. An HTTP 401 or 403 is expected without a login token and confirms that the route exists and authentication is enforced. A 500 means inspect the backend terminal and migration status; a 404 means the wrong backend instance is running.

Then log in as a student and verify a bill notification. A bill assigned to Student A must not create a red dot for Student B. Opening Payments should mark only the current student's `BILL_CREATED` notifications as read; refreshing must keep the dot cleared.
