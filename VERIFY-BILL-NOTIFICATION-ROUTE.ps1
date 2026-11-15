$ErrorActionPreference = "Stop"
$uri = "http://127.0.0.1:3001/notifications/unread-count/BILL_CREATED"

try {
    $response = Invoke-WebRequest -Uri $uri -Method Get -UseBasicParsing -TimeoutSec 8
    if ($response.StatusCode -eq 200) {
        Write-Host "PASS: Notification endpoint responded with HTTP 200." -ForegroundColor Green
    } else {
        throw "Unexpected HTTP status: $($response.StatusCode)"
    }
} catch {
    $statusCode = $null
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        $statusCode = [int]$_.Exception.Response.StatusCode
    }
    if ($statusCode -eq 401 -or $statusCode -eq 403) {
        Write-Host "PASS: The notification endpoint exists and correctly requires authentication (HTTP $statusCode)." -ForegroundColor Green
        exit 0
    }
    if ($statusCode -eq 404) {
        throw "FAIL: Backend returned 404. The running API does not expose the notification route."
    }
    if ($statusCode -eq 500) {
        throw "FAIL: Backend returned 500. Check that the Notification migration deployed successfully and inspect the backend terminal."
    }
    throw "Could not verify the notification route: $($_.Exception.Message)"
}
