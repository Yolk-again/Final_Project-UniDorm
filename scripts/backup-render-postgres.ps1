param(
    [string]$OutputDirectory = (Join-Path $HOME "UniDormBackups")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$databaseUrl = $env:UNIDORM_DATABASE_URL
if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    throw "Set UNIDORM_DATABASE_URL to the source PostgreSQL connection URL before running this script."
}

$pgDump = Get-Command pg_dump -ErrorAction Stop
$pgRestore = Get-Command pg_restore -ErrorAction Stop

$pgDumpVersion = (& $pgDump.Source --version 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $pgDumpVersion -notmatch '\)\s+(\d+)') {
    throw "Could not determine the pg_dump version."
}
if ([int]$Matches[1] -lt 18) {
    throw "PostgreSQL 18 client tools are required for this PostgreSQL 18 source database. Detected: $pgDumpVersion"
}

$pgRestoreVersion = (& $pgRestore.Source --version 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $pgRestoreVersion -notmatch '\)\s+(\d+)') {
    throw "Could not determine the pg_restore version."
}
if ([int]$Matches[1] -lt 18) {
    throw "PostgreSQL 18 client tools are required. Detected: $pgRestoreVersion"
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $OutputDirectory "unidorm-$timestamp.dump"
$manifestPath = "$backupPath.json"

if (Test-Path -LiteralPath $backupPath) {
    throw "A backup with this timestamp already exists. Run the script again in a second."
}

$dumpArguments = @(
    "--no-password",
    "--format=custom",
    "--compress=6",
    "--file=$backupPath",
    "--dbname=$databaseUrl"
)

try {
    & $pgDump.Source @dumpArguments
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE."
    }

    if (-not (Test-Path -LiteralPath $backupPath) -or (Get-Item -LiteralPath $backupPath).Length -lt 1) {
        throw "pg_dump did not produce a non-empty backup file."
    }

    & $pgRestore.Source --list $backupPath | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "pg_restore could not read the backup archive."
    }

    $file = Get-Item -LiteralPath $backupPath
    $hash = (Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash

    $manifest = [ordered]@{
        format = "PostgreSQL custom archive"
        createdAtUtc = [DateTime]::UtcNow.ToString("o")
        archiveFile = $file.Name
        archiveSizeBytes = $file.Length
        sha256 = $hash
        pgDumpVersion = $pgDumpVersion
        pgRestoreVersion = $pgRestoreVersion
    }

    $manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

    Write-Output "Backup created and archive-validated."
    Write-Output "Archive: $backupPath"
    Write-Output "Manifest: $manifestPath"
    Write-Output "Size (bytes): $($file.Length)"
    Write-Output "SHA-256: $hash"
}
catch {
    if (Test-Path -LiteralPath $backupPath) {
        Remove-Item -LiteralPath $backupPath -Force
    }
    if (Test-Path -LiteralPath $manifestPath) {
        Remove-Item -LiteralPath $manifestPath -Force
    }
    throw
}
