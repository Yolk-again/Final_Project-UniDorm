# Student bill notification HTTP 500 — migration status fix

The last helper script incorrectly stopped when `prisma migrate status` returned a non-zero exit code for a pending migration. This version distinguishes pending migrations from migrations explicitly reported as failed, then applies pending migrations with `prisma migrate deploy`.

Run `FIX-BILL-NOTIFICATION-500.ps1` from the extracted UniDorm root. See `ROUND-12-BILL-NOTIFICATION-POWERSHELL.md` for the exact commands.

No new migration was added in this repair. The existing `20261115100000_add_in_app_notifications` migration is deployed by the script. No data reset or automatic `migrate resolve` is performed.
