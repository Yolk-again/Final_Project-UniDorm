# UniDorm production-readiness update — PowerShell 5.1

## Before applying

1. Stop both backend and frontend terminals with `Ctrl+C`.
2. Back up the PostgreSQL database and the private payment proof folder (if it already contains files). Keep both backups together: bill evidence is stored on disk while receipt metadata is stored in PostgreSQL.
3. Extract this project ZIP into `C:\Users\joetu\Projects\Final_Project-UniDorm`. Keep your `.git`, `backend\.env`, and `frontend\.env.local` files.

Example local database backup (adjust host/user/database to match your `backend\.env`; `pg_dump` prompts for the PostgreSQL password if needed):

```powershell
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"
$backupRoot = "$env:USERPROFILE\Documents\UniDorm-Backups"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
$backupFile = Join-Path $backupRoot ("unidorm-before-production-upgrade-{0}.dump" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
pg_dump -h localhost -p 5432 -U postgres -d unidorm_revival_test -Fc -f $backupFile
if ($LASTEXITCODE -ne 0) { throw "Database backup failed. Do not continue." }
$proofSource = Join-Path $root "backend\uploads\payment-proofs"
if (Test-Path $proofSource) {
    Copy-Item $proofSource (Join-Path $backupRoot ("payment-proofs-{0}" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))) -Recurse
}
```

## Install, migrate and verify

```powershell
$ErrorActionPreference = "Stop"
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"

Set-Location "$root\backend"
npm ci
.\node_modules\.bin\prisma.cmd validate
```

If this database already recorded P3018 for `20261115060000_enforce_core_data_integrity`, extract the repaired project and run the recovery script from the project root:

```powershell
Set-Location $root
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$root\FIX-ROUND10-MIGRATION.ps1"
```

For a fresh database with no failed migration record, use:

```powershell
Set-Location "$root\backend"
.\node_modules\.bin\prisma.cmd migrate deploy
.\node_modules\.bin\prisma.cmd generate
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand

Set-Location "$root\frontend"
npm ci
npm run lint
npm run build
```

Do not use `prisma migrate reset`. This production-readiness update includes two migrations: the manual-payment migration preserves records, converts stored money columns to `DECIMAL(10,2)`, and adds fields/tables for manual payment evidence, receipt history, and review; the core-integrity migration adds foreign keys from bookings and bills to their student and room records, positive-amount checks, a proof-size check, and a database constraint allowing only one payment submission awaiting review per bill. The core migration adds its Booking/PaymentBill foreign keys and data CHECK constraints as `NOT VALID`: existing inconsistent historical records are preserved, while new rows and changed references must satisfy the constraints. Legacy exceptions remain for manual reconciliation and later constraint validation; they are not silently deleted or reassigned. The earlier manual-payment migration also adds partial unique indexes to prevent a student or room from having two `Pending`/`Approved` bookings concurrently.

## Run locally

Backend terminal:

```powershell
Set-Location "C:\Users\joetu\Projects\Final_Project-UniDorm\backend"
npm run start:dev
```

Frontend terminal:

```powershell
Set-Location "C:\Users\joetu\Projects\Final_Project-UniDorm\frontend"
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open `http://localhost:3000`.

## Manual payment acceptance test

1. Sign in as a student and open a `PENDING` or `REJECTED` bill.
2. Submit a reference plus a genuine JPG, PNG, or PDF receipt (maximum 5 MB).
3. Confirm the student view changes to `AWAITING REVIEW`, not `PAID`.
4. Sign in as admin. Open Payments and transactions, select `View proof`, and compare the receipt with the actual payment record outside the application.
5. Verify the payment. Confirm the student bill changes to `VERIFIED PAID` and shows the verification timestamp.
6. Submit another proof, reject it with a reason, and confirm the student sees the reason and can submit corrected evidence.
7. Try calling the removed student `PATCH /payments/:id/pay` route: it must not mark a bill paid.

## Production deployment requirements

- Set `NODE_ENV=production`.
- Set a unique, random `JWT_SECRET` with at least 32 characters.
- Set the production `DATABASE_URL` and exact HTTPS `FRONTEND_URL` origin(s).
- Set `PAYMENT_PROOF_DIR` to an absolute durable private volume outside any public web directory. The API rejects a relative path in production. Never store proof uploads in an ephemeral container layer.
- Use HTTPS frontend origin(s) in `FRONTEND_URL`. Production startup rejects non-HTTPS origins.
- Use a trusted ingress/reverse proxy with distributed rate limiting for authentication routes. The app does not pretend a per-process limit is sufficient for multi-instance production.
- Back up PostgreSQL and payment proof files together, encrypt backups, and test restoration before going live.

The API now exposes `/health/ready` as a database-readiness check in addition to the liveness `/health` endpoint. The new route executes a lightweight PostgreSQL query and returns ready only when the database responds.

This update creates a stronger foundation; it is not a substitute for production infrastructure, backups, monitoring, privacy notice/retention policy, and a real operational payment verification process.
