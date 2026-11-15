# UniDorm Chat Read-Receipt TypeScript Build Fix

## Fix

The read-receipt listing in `backend/src/chat/chat.service.ts` now uses an explicit `ChatReadReceiptSummary` type. The no-user-identity branch returns a typed empty array, and the receipt map is built with an explicitly typed `[chatKey, receipt]` tuple. This prevents TypeScript from inferring `any[][]` for the map entries or `{}` for map values.

## Apply

This is a source-only TypeScript fix. It does not change the Prisma schema or add a migration. The Round 8 per-user read-receipt migration has already been applied in the database according to the supplied PowerShell output.

From the backend folder:

```powershell
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

If Prisma Client needs regeneration after extracting the project:

```powershell
.\node_modules\.bin\prisma.cmd generate
```

No database reset is needed.
