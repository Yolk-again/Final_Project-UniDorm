# UniDorm PostgreSQL backup and restore playbook

Last reviewed: 16 November 2026

## Current database risk

The connected Render workspace reports the `unidorm-demo-db` free PostgreSQL 18 database as available, with an expiration of **15 December 2026**. Treat this as a hard data-export deadline, not an extension guarantee. Check the Render dashboard for the latest account-specific status before acting.

This repository now includes two guarded Windows PowerShell scripts:

- `scripts/backup-render-postgres.ps1` creates a PostgreSQL custom-format dump, checks that PostgreSQL 18 client tools are present, validates that the archive can be read, and writes a SHA-256 manifest.
- `scripts/restore-postgres-backup.ps1` verifies the manifest hash, refuses to restore to the same database as the source, checks that the destination has no user database objects, restores in one transaction, and verifies public tables plus Prisma migration history.

**No database export or restore has been performed by this repository change.** The scripts are prepared, but an authorized external database connection is still required. Keep using synthetic demo records until a retained database and a successful restore have been verified.

## Prerequisites

- Windows PowerShell 5.1 or PowerShell 7.
- PostgreSQL 18 command-line tools available on PATH: `pg_dump`, `pg_restore`, and `psql`.
- Access to the Render database's external connection URL.
- A secure, separate destination PostgreSQL 18 database for the restore rehearsal. It must be empty.
- A private local folder for the archive. Do not place database dumps in Git, a public folder, or a shared upload.

Check the client tools:

```powershell
pg_dump --version
pg_restore --version
psql --version
```

Use PostgreSQL 18 client tools for the current PostgreSQL 18 source. Do not paste connection URLs, passwords, or database credentials into chat, GitHub issues, source files, or terminal transcripts.

## Step 1 — Temporarily allow your own IP

In the Render dashboard, open the `unidorm-demo-db` database and its networking/IP allowlist settings. Add only the public IP address of the computer performing the export, using a single-address CIDR (usually `/32`). Do not open the database to `0.0.0.0/0`.

Use the external connection URL from the database's connection details. The Render internal URL will not work from a local Windows computer.

## Step 2 — Create and validate the backup

Run from the project root:

```powershell
$ErrorActionPreference = "Stop"

$secureUrl = Read-Host "Paste the Render external database URL" -AsSecureString
$env:UNIDORM_DATABASE_URL = (New-Object System.Net.NetworkCredential("", $secureUrl)).Password

.scripts\backup-render-postgres.ps1

Get-ChildItem "$HOME\UniDormBackups\unidorm-*.dump" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 3 Name, Length, LastWriteTime

$env:UNIDORM_DATABASE_URL = $null
```

The script stores the archive and its `.json` manifest in `$HOME\UniDormBackups`. The manifest contains the archive size, tool versions, timestamp, and SHA-256 checksum; it does not contain the database URL.

Keep at least two private copies of the archive and manifest in separate protected storage locations. Encrypt the copies at rest. Do not upload the dump to this public GitHub repository.

After the export completes, remove the temporary local-IP allowlist entry from Render unless you still need it for the separate restore/verification task.

## Step 3 — Restore into a separate empty database

First create a fresh empty PostgreSQL 18 database on a local test server or another retained PostgreSQL server. For a local PostgreSQL installation, one example is:

```powershell
createdb --host localhost --port 5432 --username postgres unidorm_restore_test
if ($LASTEXITCODE -ne 0) { throw "Could not create the empty restore-test database." }
```

Do not use the existing Render source database as the destination. Do not use a database that contains application data.

Set both URLs securely, then restore the archive created in Step 2:

```powershell
$ErrorActionPreference = "Stop"

$secureSourceUrl = Read-Host "Paste the original Render external database URL" -AsSecureString
$env:UNIDORM_SOURCE_DATABASE_URL = (New-Object System.Net.NetworkCredential("", $secureSourceUrl)).Password

$secureTargetUrl = Read-Host "Paste the separate empty restore-test database URL" -AsSecureString
$env:UNIDORM_RESTORE_DATABASE_URL = (New-Object System.Net.NetworkCredential("", $secureTargetUrl)).Password

$backup = Get-ChildItem "$HOME\UniDormBackups\unidorm-*.dump" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if ($null -eq $backup) { throw "No UniDorm backup archive was found." }

.scripts\restore-postgres-backup.ps1 -BackupFile $backup.FullName
```

The restore script will stop if the source and destination resolve to the same database, if the archive hash is wrong, or if the destination is not empty. It uses a single transaction and does not drop existing databases or tables.

## Step 4 — Check Prisma migration state

After the restore reports success, point the local Prisma CLI at the restored database and inspect migration status:

```powershell
$env:DATABASE_URL = $env:UNIDORM_RESTORE_DATABASE_URL
Push-Location .\backend
npx prisma migrate status
if ($LASTEXITCODE -ne 0) { throw "Prisma migration status check failed." }
Pop-Location
```

Then run application smoke tests against the restored database in a local/test environment. Verify representative rows from users, rooms, bookings, announcements, chat, bills, payment-submission history, notifications, and Prisma migration history. Do not send real student data to a public test environment.

Finally clear the connection variables from the current PowerShell session:

```powershell
$env:UNIDORM_SOURCE_DATABASE_URL = $null
$env:UNIDORM_RESTORE_DATABASE_URL = $null
$env:DATABASE_URL = $null
```

## Step 5 — Plan the retained database cutover

Only after the backup has been independently copied, restored, and verified should the backend be pointed at a retained database. The destination needs:

- A clear retention policy and no near-term automatic expiration.
- Automated backups and a documented recovery window.
- A successful restore rehearsal from a separate backup.
- Private network access/TLS and restricted credentials.
- Enough capacity for the expected demo/pilot usage.

The current `render.yaml` still references the existing free Render database. Do not change that reference until the replacement database is selected and the restore has passed. A cutover also needs a safe final export immediately before switching, a maintenance window to prevent writes during the final copy, and a tested rollback plan.

## Do not do these things

- Do not run `prisma migrate reset` against the source database.
- Do not run `pg_restore --clean` or restore over the live source.
- Do not change Render's production `DATABASE_URL` before the restore and smoke tests pass.
- Do not disable the database IP allowlist or add `0.0.0.0/0` just to make an export easier.
- Do not treat a successful dump command as proof of recoverability; the separate restore is required.
- Do not put database backups, receipt files, passwords, or connection URLs in Git.

## Current completion state

The scripts and this runbook are repository changes only. The source database has not yet been exported, the archive has not yet been restored, and Render has not been switched to a replacement database. Those actions require the database owner's external connection access and destination database.
