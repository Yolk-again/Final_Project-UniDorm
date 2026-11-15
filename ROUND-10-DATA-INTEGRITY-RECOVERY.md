# Round 10 data integrity migration recovery

## Why the migration stopped

The existing database has one or more `PaymentBill.roomNumber` values that refer to room numbers no longer present in `Room`. These are historical billing records. They must not be deleted, rewritten, or assigned to a different room just to make a foreign-key migration pass.

The integrity migration now adds `PaymentBill_roomNumber_fkey` as `NOT VALID`. PostgreSQL preserves existing rows while enforcing the foreign key for new or changed references. New bill creation is still checked against an existing room and approved student-room booking by the API.

This leaves legacy orphan records visible for reconciliation. It does not pretend they have been repaired. The migration still validates the booking-to-room and bill-to-student relationships, positive amounts, proof constraints, and the other integrity checks.

## Recover the failed migration

The first Round 10 migration (`20261115050000_manual_payment_verification_and_decimal_money`) already succeeded. The second migration (`20261115060000_enforce_core_data_integrity`) failed and Prisma recorded it as failed (P3018).

After extracting this updated project and stopping both development servers, run from the backend folder:

```powershell
$ErrorActionPreference = "Stop"
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"
Set-Location "$root\backend"

$prisma = ".\node_modules\.bin\prisma.cmd"
$migration = "20261115060000_enforce_core_data_integrity"

& $prisma migrate resolve --rolled-back $migration
if ($LASTEXITCODE -ne 0) { throw "Could not mark the failed migration as rolled back." }

& $prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw "Migration deployment failed. Stop and inspect the error." }

& $prisma generate
if ($LASTEXITCODE -ne 0) { throw "Prisma Client generation failed." }

npm run build
if ($LASTEXITCODE -ne 0) { throw "Backend build failed." }

npm test -- --runInBand
if ($LASTEXITCODE -ne 0) { throw "Backend unit tests failed." }

npm run test:e2e -- --runInBand
if ($LASTEXITCODE -ne 0) { throw "Backend e2e tests failed." }
```

Do not run `prisma migrate reset`. Do not mark the failed migration as applied; it has not completed. Do not rerun the already successful 050000 migration manually.

## Inspect historical orphaned room references

To list legacy bills that need administrative reconciliation, run this query using pgAdmin or `psql`:

```sql
SELECT p."id", p."studentId", p."roomNumber", p."billingLabel", p."amount", p."status", p."createdAt"
FROM "PaymentBill" p
LEFT JOIN "Room" r ON r."roomNumber" = p."roomNumber"
WHERE p."roomNumber" IS NOT NULL
  AND r."id" IS NULL
ORDER BY p."createdAt" DESC;
```

Review these with the dormitory's actual records. Restore the correct room record or retain the bill as a historical orphan until an authorized reconciliation decision is made. Do not guess room assignments.
