# Round 13 — Notification popup and timestamp consistency fix

## Changes

- Rendered the notification panel in a document-level portal so dashboard headers with `overflow: hidden` no longer clip it.
- Positioned the panel within the browser viewport. On short windows it moves upward and its notification list scrolls inside the panel instead of extending off-screen.
- Added automatic repositioning when the browser is resized or the page scrolls, and Escape-key dismissal.
- Kept the outside-click layer transparent so it does not dim or blur the dashboard.
- Standardized the Student and Admin data-sync label and updated timestamp colors. Both now use the same dark text on a small white surface for consistent contrast.
- No backend code, database schema, migrations, environment files, or user data were changed.

## Apply on Windows PowerShell 5.1

Stop the frontend and backend terminals with Ctrl+C. Extract this ZIP into the existing project root:

```powershell
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"
$zip = Join-Path $env:USERPROFILE "Downloads\UniDorm-Notification-Popup-and-Timestamp-Consistency-Fix-Full-Project.zip"
Expand-Archive -LiteralPath $zip -DestinationPath $root -Force
```

The archive does not contain `.env`, `.env.local`, `.git`, or `node_modules`, so your local environment files and Git history stay in place.

Build and run the frontend:

```powershell
Set-Location "$root\frontend"
npm run build
npm run dev
```

No Prisma migration or database command is required for this frontend-only change.
