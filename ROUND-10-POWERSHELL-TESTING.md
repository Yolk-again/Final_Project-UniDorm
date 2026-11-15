# Round 10 — Windows PowerShell 5.1 testing

Open PowerShell after extracting the ZIP into `C:\Users\joetu\Projects\Final_Project-UniDorm`. Keep `.git`, `backend\.env`, and `frontend\.env.local` from your current project.

## 1. Back up database and proof files

Use the `pg_dump` and proof-folder copy example in `PRODUCTION-READINESS-POWERSHELL.md`. Do not continue if the database backup fails.

## 2. Install, migrate and generate

```powershell
$ErrorActionPreference = "Stop"
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"

Set-Location "$root\backend"
npm ci
.\node_modules\.bin\prisma.cmd validate
```

The production-readiness update adds two migrations after the earlier announcement/chat migrations: `20261115050000_manual_payment_verification_and_decimal_money` and `20261115060000_enforce_core_data_integrity`.

**Recovery for the database that previously failed with P3018:** the first migration has already succeeded, while the second migration failed because historical bills reference deleted rooms. After extracting the repaired package, run this once instead of running `migrate deploy` directly:

```powershell
Set-Location $root
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$root\FIX-ROUND10-MIGRATION.ps1"
```

The recovery script marks only `20261115060000_enforce_core_data_integrity` as rolled back, retries the corrected migration, regenerates Prisma Client, builds the backend, and runs backend tests. The corrected migration keeps old bill records and adds the bill-to-room foreign key as `NOT VALID`, which enforces new/changed references without failing on historical orphan rows.

## 3. Build and test

```powershell
Set-Location "$root\backend"
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand

Set-Location "$root\frontend"
npm ci
npm run lint
npm run build
```

## 4. Local manual-payment acceptance test

1. Log in as a student and confirm the bill is not shown as paid merely because a receipt was uploaded.
2. Submit a reference and a genuine JPG, PNG, or PDF receipt under 5 MB.
3. Confirm the bill becomes `SUBMITTED` and shows the submission timestamp.
4. Log in as an admin and inspect the private proof.
5. Approve it and confirm only then the bill becomes `PAID`, with verifier and time recorded.
6. Repeat with a rejection reason, then resubmit corrected evidence. Confirm the former attempt stays visible in history.
7. Try submitting to another student's bill and try calling the removed student mark-as-paid endpoint; both must fail.

## 5. Data integrity acceptance checks

1. Attempt to book a room already Pending/Approved for another student; the second booking must fail.
2. Attempt to create two active bookings for one student; the second must fail.
3. Attempt to delete an Approved booking or a room with booking/bill history; it must be refused.
4. Check `http://127.0.0.1:3001/health` for API liveness and `/health/ready` for PostgreSQL readiness.

Do not run `prisma migrate reset` on a database containing records.
