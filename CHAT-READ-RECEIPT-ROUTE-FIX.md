# Chat read-receipt route fix

The frontend calls `PATCH /chat/threads/:chatKey/read`. The matching NestJS endpoint is defined in `backend/src/chat/chat.controller.ts` and the `ChatModule` is imported by `AppModule`.

The reported `Cannot PATCH ... 404` response means the backend process serving port 3001 has not loaded the controller version that contains this endpoint (typically an old compiled `dist` process or a backend launched from another project copy). Re-extracting source alone does not update an already-running Node process.

## Rebuild and restart

Stop the old backend terminal with Ctrl+C. From the project root run:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\FIX-CHAT-READ-RECEIPT.ps1
```

The script safely stops a port-3001 process only when its command line points into this project's `backend` folder, rebuilds the backend from `src`, and starts the freshly built server. If port 3001 belongs to a different process, it stops and asks you to stop that process manually rather than killing an unrelated program.

## Verify route registration

Open a second PowerShell terminal at the project root and run:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\VERIFY-CHAT-READ-ROUTE.ps1
```

An HTTP 401/403 is a PASS: it proves the route exists and the request reached NestJS, which correctly requires an authenticated admin. HTTP 404 means the wrong backend process/project is still serving port 3001.

No new Prisma migration is required by this fix. The existing `adminLastReadAt` migration remains part of this project.
