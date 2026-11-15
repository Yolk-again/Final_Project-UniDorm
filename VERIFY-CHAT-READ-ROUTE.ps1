$ErrorActionPreference = "Stop"

$url = "http://127.0.0.1:3001/chat/threads/group-female/read"

try {
    $response = Invoke-WebRequest -Uri $url -Method Patch -UseBasicParsing -TimeoutSec 5
    Write-Host "Unexpected response: HTTP $([int]$response.StatusCode). The route answered without authentication." -ForegroundColor Yellow
}
catch {
    $response = $_.Exception.Response
    if (-not $response) {
        throw "Could not connect to the backend at 127.0.0.1:3001. Start the backend first. Details: $($_.Exception.Message)"
    }

    $statusCode = [int]$response.StatusCode
    if ($statusCode -eq 401 -or $statusCode -eq 403) {
        Write-Host "PASS: PATCH /chat/threads/:chatKey/read is registered. HTTP $statusCode is expected without a login token." -ForegroundColor Green
    }
    elseif ($statusCode -eq 404) {
        throw "FAIL: Backend still returns 404. It is running an old build or a different project folder. Run FIX-CHAT-READ-RECEIPT.ps1 from the project root."
    }
    else {
        throw "The route responded with HTTP $statusCode. Review the backend response and server log."
    }
}
