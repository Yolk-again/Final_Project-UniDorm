# Round 10 migration and backend build repair

## What the reported errors mean

1. `P3018` on `20261115060000_enforce_core_data_integrity` was caused by existing `PaymentBill` records whose `roomNumber` no longer exists in `Room`. These are historical billing records. They must not be deleted or silently assigned to another room.
2. The TypeScript error in `PaymentService.submitPayment` was caused by `includes()` inferring too narrow a status union. The allowed resubmission statuses are now explicitly typed as `PaymentStatus[]`, containing `PENDING` and `REJECTED` only. `SUBMITTED` is intentionally not resubmittable while an admin review is pending.

## Data-safe migration adjustment

The integrity migration no longer aborts because of historical bills that refer to deleted rooms. It adds the `PaymentBill_roomNumber_fkey` constraint as `NOT VALID`.

PostgreSQL preserves the existing orphaned bill rows. The foreign key is still enforced for new or changed room references. API-level bill creation also verifies that the room exists and that the student has an approved booking for that room. Room deletion remains restricted when referenced by a bill.

The migration does not delete, rewrite, or guess the room assignment for any historical bill. Orphaned history should be reviewed separately with the dormitory's source records.

## Exact recovery for the database that returned P3018

The user already successfully applied `20261115050000_manual_payment_verification_and_decimal_money`; do not roll it back. The failed migration is `20261115060000_enforce_core_data_integrity`.

After extracting this corrected ZIP over the existing project and stopping both servers, run from PowerShell 5.1:

```powershell
$ErrorActionPreference = "Stop"
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"
Set-Location $root

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$root\FIX-ROUND10-MIGRATION.ps1"
```

The script marks only migration `20261115060000_enforce_core_data_integrity` as rolled back, then reapplies the corrected file, generates Prisma Client, builds the backend, and runs unit/e2e tests.

Do not run `prisma migrate reset`. Do not mark the failed migration as applied; it has not completed. Do not manually rerun migration `20261115050000` because it already succeeded.

## Inspect historical bill-to-room references

Use pgAdmin or `psql` to inspect existing orphan records:

```sql
SELECT p."id", p."studentId", p."roomNumber", p."billingLabel", p."amount", p."status", p."createdAt"
FROM "PaymentBill" p
LEFT JOIN "Room" r ON r."roomNumber" = p."roomNumber"
WHERE p."roomNumber" IS NOT NULL
  AND r."id" IS NULL
ORDER BY p."createdAt" DESC;
```

Keep this history intact until the correct room association can be confirmed from original dorm records.
