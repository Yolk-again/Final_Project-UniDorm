$ErrorActionPreference = "Stop"

$url = "http://127.0.0.1:3001/announcements/1/read"
try {
    $response = Invoke-WebRequest -Uri $url -Method Patch -UseBasicParsing -TimeoutSec 8
    Write-Host "Unexpected response: HTTP $([int]$response.StatusCode). The route answered without authentication." -ForegroundColor Yellow
}
catch {
    $response = $_.Exception.Response
    if (-not $response) {
        throw "Could not connect to the backend at 127.0.0.1:3001. Start the backend first. Details: $($_.Exception.Message)"
    }

    $statusCode = [int]$response.StatusCode
    if ($statusCode -eq 401 -or $statusCode -eq 403) {
        Write-Host "PASS: PATCH /announcements/:id/read is registered. HTTP $statusCode is expected without a login token." -ForegroundColor Green
    }
    elseif ($statusCode -eq 404) {
        throw "FAIL: Backend still returns 404. Check that port 3001 is running this project's freshly built backend, not an older backend or another project."
    }
    else {
        throw "The announcement read route responded with HTTP $statusCode. Review the backend server log."
    }
}
