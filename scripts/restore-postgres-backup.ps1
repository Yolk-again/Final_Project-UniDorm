param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$sourceUrl = $env:UNIDORM_SOURCE_DATABASE_URL
$targetUrl = $env:UNIDORM_RESTORE_DATABASE_URL

if ([string]::IsNullOrWhiteSpace($sourceUrl)) {
    throw "Set UNIDORM_SOURCE_DATABASE_URL to the original source database URL."
}
if ([string]::IsNullOrWhiteSpace($targetUrl)) {
    throw "Set UNIDORM_RESTORE_DATABASE_URL to a separate, empty destination database URL."
}

function Get-DatabaseIdentity {
    param([string]$ConnectionUrl)

    try {
        $uri = [Uri]$ConnectionUrl
    }
    catch {
        throw "A database connection URL could not be parsed."
    }

    if (-not $uri.IsAbsoluteUri -or [string]::IsNullOrWhiteSpace($uri.Host)) {
        throw "A valid PostgreSQL connection URL is required."
    }

    $port = if ($uri.Port -lt 1) { 5432 } else { $uri.Port }
    $databasePath = $uri.AbsolutePath.TrimEnd("/")
    return "$($uri.Host.ToLowerInvariant()):$port$($databasePath.ToLowerInvariant())"
}

if ((Get-DatabaseIdentity $sourceUrl) -eq (Get-DatabaseIdentity $targetUrl)) {
    throw "The source and restore destination resolve to the same database. Restore is blocked."
}

if (-not (Test-Path -LiteralPath $BackupFile -PathType Leaf)) {
    throw "The backup file does not exist: $BackupFile"
}

$backupPath = (Resolve-Path -LiteralPath $BackupFile).Path
$manifestPath = "$backupPath.json"

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "The backup manifest is missing. Use an archive created by scripts/backup-render-postgres.ps1."
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$actualHash = (Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash

if ([string]::IsNullOrWhiteSpace([string]$manifest.sha256) -or $actualHash -ne [string]$manifest.sha256) {
    throw "The backup SHA-256 check failed. The archive may be incomplete or altered."
}

$pgRestore = Get-Command pg_restore -ErrorAction Stop
$psql = Get-Command psql -ErrorAction Stop

$pgRestoreVersion = (& $pgRestore.Source --version 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $pgRestoreVersion -notmatch '\)\s+(\d+)') {
    throw "Could not determine the pg_restore version."
}
if ([int]$Matches[1] -lt 18) {
    throw "PostgreSQL 18 client tools are required. Detected: $pgRestoreVersion"
}

& $pgRestore.Source --list $backupPath | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "pg_restore could not read the backup archive."
}

$emptyDatabaseQuery = "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp_%' AND c.relkind IN ('r','p','v','m','S','f');"
$relationCountOutput = (& $psql.Source -X -qAt -v ON_ERROR_STOP=1 "--dbname=$targetUrl" -c $emptyDatabaseQuery 2>&1 | Out-String).Trim()

if ($LASTEXITCODE -ne 0 -or $relationCountOutput -notmatch '^\d+$') {
    throw "Could not verify that the destination database is empty. Restore was not started."
}

if ([Int64]$relationCountOutput -ne 0) {
    throw "The destination database contains $relationCountOutput database objects. Restore was not started. Use a new empty database."
}

$restoreArguments = @(
    "--exit-on-error",
    "--single-transaction",
    "--no-owner",
    "--no-privileges",
    "--dbname=$targetUrl",
    $backupPath
)

& $pgRestore.Source @restoreArguments
if ($LASTEXITCODE -ne 0) {
    throw "pg_restore failed with exit code $LASTEXITCODE. The single-transaction restore should have rolled back."
}

$tableCountQuery = "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
$tableCountOutput = (& $psql.Source -X -qAt -v ON_ERROR_STOP=1 "--dbname=$targetUrl" -c $tableCountQuery 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $tableCountOutput -notmatch '^\d+$' -or [Int64]$tableCountOutput -lt 1) {
    throw "The restore completed but the post-restore table check failed. Review the destination before using it."
}

$migrationCheckQuery = "SELECT CASE WHEN to_regclass('public.""_prisma_migrations""') IS NULL THEN 0 ELSE 1 END;"
$migrationCheckOutput = (& $psql.Source -X -qAt -v ON_ERROR_STOP=1 "--dbname=$targetUrl" -c $migrationCheckQuery 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $migrationCheckOutput -ne "1") {
    throw "The restored database does not contain the expected Prisma migration history table. Do not switch the application to this database."
}

Write-Output "Restore completed to the separate destination database."
Write-Output "Public base tables found: $tableCountOutput"
Write-Output "Prisma migration history: present"
Write-Output "Next: run Prisma migration status and application smoke tests against this destination before changing production configuration."
