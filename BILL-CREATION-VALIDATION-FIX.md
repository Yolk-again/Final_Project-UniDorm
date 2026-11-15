# Bill creation validation fix

Bill creation now validates every required field in both the admin UI and the NestJS API. The API independently verifies that:

- the Student ID belongs to an existing student account;
- the room exists;
- that student has an approved booking for that exact room;
- category, billing cycle, label, amount, and due date are valid.

A bill is rejected before it is inserted when any check fails. Room numbers are normalized to uppercase before lookup and storage. No Prisma schema migration is required.

## Test

From the project root, run:

```powershell
Set-Location .\backend
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand

Set-Location ..\frontend
npm run lint
npm run build
```

Then sign in as admin and try creating a bill with a nonexistent student, nonexistent room, or a room that is not approved for that student. Each should show an error and create no ledger record. A bill with a valid student and their approved room should be accepted.
