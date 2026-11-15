# UniDorm Chat Read-Receipt Prisma Client Fix

## Cause

The chat controller and service already contain the PATCH read-receipt route, and the Prisma schema/migration define `ChatThread.adminLastReadAt`. The previous launcher built the NestJS backend before regenerating Prisma Client, so TypeScript compiled against a stale generated client that did not contain `adminLastReadAt`.

## Fix

`FIX-CHAT-READ-RECEIPT.ps1` now performs these steps in order:

1. Stops only a port-3001 process whose command line belongs to this project backend.
2. Runs `prisma migrate deploy` to apply any pending migration, including the admin read-receipt column migration.
3. Runs `prisma generate` to regenerate Prisma Client from `backend/prisma/schema.prisma`.
4. Builds the NestJS backend.
5. Starts the freshly built API with `npm run start:prod`.

The Prisma schema and existing migration are preserved; no duplicate migration is added.

## Run

From the project root:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\FIX-CHAT-READ-RECEIPT.ps1
```

Keep the terminal open. In a second PowerShell window, run:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\VERIFY-CHAT-READ-ROUTE.ps1
```

An HTTP 401 or 403 without a token is expected and confirms the route exists behind authentication. A 404 means another backend build or project path is answering on port 3001.
