# UniDorm PowerShell Testing

```powershell
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"

Set-Location "$root\backend"
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand

Set-Location "$root\frontend"
npm run lint
npm run build
```

Start the backend in one terminal:

```powershell
Set-Location "C:\Users\joetu\Projects\Final_Project-UniDorm\backend"
npm run start:dev
```

Start the frontend in a second terminal:

```powershell
Set-Location "C:\Users\joetu\Projects\Final_Project-UniDorm\frontend"
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open `http://localhost:3000`.


## Latest chat read receipt and admin navigation fix

No new database migration is required for this update. The existing `adminLastReadAt` migration must already be deployed. To test locally:

```powershell
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"
Set-Location "$root\backend"
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
Set-Location "$root\frontend"
npm run lint
npm run build
```

Open each admin group/direct thread, confirm its unread dot disappears, refresh the page, and confirm it stays gone. Send a new message from a student account to that same thread; the unread dot should then return. Check that all five admin navigation tabs appear side by side and match the student navigation track and active-tab styling.


## Chat read-receipt route / stale Prisma Client

If the backend build reports that `adminLastReadAt` does not exist in the generated Prisma types, do not edit generated `node_modules` files. Run the root-level launcher, which deploys pending migrations, regenerates Prisma Client, builds, and starts the API:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\FIX-CHAT-READ-RECEIPT.ps1
```

Then verify the route from another terminal:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\VERIFY-CHAT-READ-ROUTE.ps1
```

## Round 8 database and read-receipt update

This update adds per-user chat read receipts. After extracting the project, stop the running development servers and run:

```powershell
$root = "C:\Users\joetu\Projects\Final_Project-UniDorm"
Set-Location "$root\backend"
.\node_modules\.bin\prisma.cmd migrate deploy
.\node_modules\.bin\prisma.cmd generate
npm run build
```

Then run frontend checks:

```powershell
Set-Location "$root\frontend"
npm run lint
npm run build
```

No database reset is needed. The new migration preserves the previous admin-only read markers and adds independent read markers for each student and admin in every chat.
